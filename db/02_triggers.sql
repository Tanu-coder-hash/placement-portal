-- =====================================================================
-- 02_triggers.sql  —  Trigger functions that enforce business rules
--                     inside the database (cannot be bypassed by the app)
--
-- Session variables set by the application inside each transaction
-- (see lib/db.js -> withTransaction):
--   app.user_id      id of the logged-in user   (for the audit trail)
--   app.user_role    STUDENT | RECRUITER | ADMIN
--   app.status_note  free-text note stored in application_status_history
-- =====================================================================

-- ---------------------------------------------------------------------
-- Generic: keep updated_at current
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END $$;

CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON job_postings
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------
-- 1. Validate a new application (eligibility + concurrency control)
--    Lock order is always  student (FOR SHARE)  ->  job (FOR UPDATE)
--    so concurrent applies/accepts serialise without deadlocks.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_application() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_student RECORD;
    v_job     RECORD;
BEGIN
    SELECT s.student_id, s.cgpa, s.department_id, s.placement_status, u.verification_status
      INTO v_student
      FROM students s
      JOIN users u ON u.user_id = s.student_id
     WHERE s.student_id = NEW.student_id
       FOR SHARE OF s;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student profile % does not exist.', NEW.student_id;
    END IF;

    IF v_student.verification_status <> 'VERIFIED' THEN
        RAISE EXCEPTION 'Your profile must be verified by the placement office before you can apply.';
    END IF;

    IF v_student.placement_status = 'PLACED' THEN
        RAISE EXCEPTION 'You have already accepted an offer. Your placement status is locked, so you cannot apply to more jobs.';
    END IF;

    -- Row lock on the job serialises applications to the same posting,
    -- which keeps the max_applications limit exact under concurrency.
    SELECT job_id, title, status, min_cgpa, application_deadline
      INTO v_job
      FROM job_postings
     WHERE job_id = NEW.job_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job % does not exist.', NEW.job_id;
    END IF;

    IF v_job.status <> 'OPEN' THEN
        RAISE EXCEPTION 'This job is not accepting applications (status: %).', v_job.status;
    END IF;

    IF v_job.application_deadline IS NOT NULL AND v_job.application_deadline < CURRENT_DATE THEN
        RAISE EXCEPTION 'The application deadline (%) has passed.', v_job.application_deadline;
    END IF;

    IF v_student.cgpa IS NULL OR v_student.cgpa < v_job.min_cgpa THEN
        RAISE EXCEPTION 'A minimum CGPA of % is required for this job.', v_job.min_cgpa;
    END IF;

    IF EXISTS (SELECT 1 FROM job_eligible_departments WHERE job_id = NEW.job_id)
       AND NOT EXISTS (SELECT 1 FROM job_eligible_departments
                        WHERE job_id = NEW.job_id AND department_id = v_student.department_id) THEN
        RAISE EXCEPTION 'Your department is not eligible for this job.';
    END IF;

    NEW.status := 'APPLIED';
    RETURN NEW;
END $$;

CREATE TRIGGER trg_applications_validate_insert
    BEFORE INSERT ON applications
    FOR EACH ROW EXECUTE FUNCTION fn_validate_application();

-- ---------------------------------------------------------------------
-- 2. Application status state machine
--    APPLIED -> SHORTLISTED -> INTERVIEWING -> OFFERED -> ACCEPTED
--    (REJECTED / WITHDRAWN possible from any non-terminal state)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_enforce_application_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_allowed application_status[];
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    v_allowed := CASE OLD.status
        WHEN 'APPLIED'      THEN ARRAY['SHORTLISTED','INTERVIEWING','OFFERED','REJECTED','WITHDRAWN']::application_status[]
        WHEN 'SHORTLISTED'  THEN ARRAY['INTERVIEWING','OFFERED','REJECTED','WITHDRAWN']::application_status[]
        WHEN 'INTERVIEWING' THEN ARRAY['OFFERED','REJECTED','WITHDRAWN']::application_status[]
        WHEN 'OFFERED'      THEN ARRAY['ACCEPTED','REJECTED','WITHDRAWN']::application_status[]
        ELSE ARRAY[]::application_status[]          -- ACCEPTED, REJECTED, WITHDRAWN are final
    END;

    IF NOT (NEW.status = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'Invalid application status change: % -> %.', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END $$;

CREATE TRIGGER trg_applications_status_transition
    BEFORE UPDATE OF status ON applications
    FOR EACH ROW EXECUTE FUNCTION fn_enforce_application_transition();

-- ---------------------------------------------------------------------
-- 3. Milestone history (audit trail of every status change)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_log_application_status() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_user INT  := NULLIF(current_setting('app.user_id', true), '')::INT;
    v_note TEXT := NULLIF(current_setting('app.status_note', true), '');
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, note)
        VALUES (NEW.application_id, NULL, NEW.status, v_user, COALESCE(v_note, 'Application submitted'));
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, note)
        VALUES (NEW.application_id, OLD.status, NEW.status, v_user, v_note);
    END IF;
    RETURN NULL;
END $$;

CREATE TRIGGER trg_applications_log_status
    AFTER INSERT OR UPDATE OF status ON applications
    FOR EACH ROW EXECUTE FUNCTION fn_log_application_status();

-- ---------------------------------------------------------------------
-- 4. AUTO-CLOSE JOB LISTINGS
--    a) INSERT : active applications reach max_applications
--                -> status = CLOSED (APPLICATION_LIMIT_REACHED)
--    b) UPDATE : accepted offers reach hiring_quota
--                -> status = CLOSED (HIRING_QUOTA_FILLED) and every
--                   in-progress application is auto-rejected.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_close_job() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_job        RECORD;
    v_active     INT;
    v_hired      INT;
    v_prev_note  TEXT;
BEGIN
    SELECT job_id, status, max_applications, hiring_quota
      INTO v_job
      FROM job_postings
     WHERE job_id = NEW.job_id;

    IF TG_OP = 'INSERT' THEN
        IF v_job.status = 'OPEN' AND v_job.max_applications IS NOT NULL THEN
            SELECT count(*) INTO v_active
              FROM applications
             WHERE job_id = NEW.job_id AND status <> 'WITHDRAWN';

            IF v_active >= v_job.max_applications THEN
                UPDATE job_postings
                   SET status = 'CLOSED',
                       closed_reason = 'APPLICATION_LIMIT_REACHED',
                       closed_at = now()
                 WHERE job_id = NEW.job_id;
            END IF;
        END IF;

    ELSIF NEW.status = 'ACCEPTED' AND OLD.status IS DISTINCT FROM 'ACCEPTED' THEN
        SELECT count(*) INTO v_hired
          FROM applications
         WHERE job_id = NEW.job_id AND status = 'ACCEPTED';

        IF v_hired >= v_job.hiring_quota THEN
            UPDATE job_postings
               SET status = 'CLOSED',
                   closed_reason = 'HIRING_QUOTA_FILLED',
                   closed_at = COALESCE(closed_at, now())
             WHERE job_id = NEW.job_id
               AND status IN ('OPEN', 'CLOSED');

            v_prev_note := current_setting('app.status_note', true);
            PERFORM set_config('app.status_note', 'Auto-rejected: hiring quota for this job was filled', true);

            UPDATE interviews i
               SET status = 'CANCELLED'
              FROM applications a
             WHERE a.application_id = i.application_id
               AND a.job_id = NEW.job_id
               AND a.status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEWING')
               AND i.status = 'SCHEDULED';

            UPDATE applications
               SET status = 'REJECTED'
             WHERE job_id = NEW.job_id
               AND status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEWING');

            PERFORM set_config('app.status_note', COALESCE(v_prev_note, ''), true);
        END IF;
    END IF;

    RETURN NULL;
END $$;

CREATE TRIGGER trg_applications_auto_close_job
    AFTER INSERT OR UPDATE OF status ON applications
    FOR EACH ROW EXECUTE FUNCTION fn_auto_close_job();

-- ---------------------------------------------------------------------
-- 5. Interview scheduling integrity
--    * only for live applications, only in the future
--    * no overlapping SCHEDULED interviews for the same student
--      (advisory lock per student makes the check race-free)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_interview() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_student_id  INT;
    v_app_status  application_status;
    v_conflict    RECORD;
    v_range       tstzrange;
BEGIN
    SELECT a.student_id, a.status
      INTO v_student_id, v_app_status
      FROM applications a
     WHERE a.application_id = NEW.application_id;

    IF TG_OP = 'INSERT' THEN
        IF v_app_status IN ('ACCEPTED', 'REJECTED', 'WITHDRAWN') THEN
            RAISE EXCEPTION 'Cannot schedule an interview for an application that is %.', v_app_status;
        END IF;
        IF NEW.scheduled_at <= now() THEN
            RAISE EXCEPTION 'Interviews must be scheduled in the future.';
        END IF;
    END IF;

    IF NEW.status = 'SCHEDULED' THEN
        PERFORM pg_advisory_xact_lock(7001, v_student_id);

        v_range := tstzrange(NEW.scheduled_at,
                             NEW.scheduled_at + make_interval(mins => NEW.duration_minutes::INT));

        SELECT i.interview_id, i.round_name, j.title
          INTO v_conflict
          FROM interviews i
          JOIN applications a ON a.application_id = i.application_id
          JOIN job_postings j ON j.job_id = a.job_id
         WHERE a.student_id = v_student_id
           AND i.status = 'SCHEDULED'
           AND i.interview_id <> NEW.interview_id
           AND tstzrange(i.scheduled_at,
                         i.scheduled_at + make_interval(mins => i.duration_minutes::INT)) && v_range
         LIMIT 1;

        IF FOUND THEN
            RAISE EXCEPTION 'Scheduling conflict: the candidate already has the "%" round for "%" in this time slot.',
                v_conflict.round_name, v_conflict.title;
        END IF;
    END IF;

    RETURN NEW;
END $$;

CREATE TRIGGER trg_interviews_validate
    BEFORE INSERT OR UPDATE OF scheduled_at, duration_minutes, status ON interviews
    FOR EACH ROW EXECUTE FUNCTION fn_validate_interview();

-- ---------------------------------------------------------------------
-- 6. Offers can only be issued to unplaced students with a live application
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_offer() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_app_status        application_status;
    v_placement_status  placement_status;
BEGIN
    SELECT a.status, s.placement_status
      INTO v_app_status, v_placement_status
      FROM applications a
      JOIN students s ON s.student_id = a.student_id
     WHERE a.application_id = NEW.application_id;

    IF v_placement_status = 'PLACED' THEN
        RAISE EXCEPTION 'This student has already accepted another offer; a new offer cannot be issued.';
    END IF;

    IF v_app_status NOT IN ('APPLIED', 'SHORTLISTED', 'INTERVIEWING') THEN
        RAISE EXCEPTION 'An offer cannot be issued for an application that is %.', v_app_status;
    END IF;

    IF NEW.respond_by < CURRENT_DATE THEN
        RAISE EXCEPTION 'The response deadline must not be in the past.';
    END IF;

    RETURN NEW;
END $$;

CREATE TRIGGER trg_offers_validate_insert
    BEFORE INSERT ON offers
    FOR EACH ROW EXECUTE FUNCTION fn_validate_offer();

-- ---------------------------------------------------------------------
-- 7. Lock the placement status of placed students
--    Only a placement officer (app.user_role = ADMIN) may reverse it.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_lock_placed_student() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.placement_status = 'PLACED'
       AND (NEW.placement_status IS DISTINCT FROM OLD.placement_status
            OR NEW.placed_offer_id IS DISTINCT FROM OLD.placed_offer_id)
       AND COALESCE(NULLIF(current_setting('app.user_role', true), ''), 'NONE') <> 'ADMIN' THEN
        RAISE EXCEPTION 'Placement status is locked once an offer is accepted. Only the placement officer can change it.';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_students_lock_placement
    BEFORE UPDATE OF placement_status, placed_offer_id ON students
    FOR EACH ROW EXECUTE FUNCTION fn_lock_placed_student();
