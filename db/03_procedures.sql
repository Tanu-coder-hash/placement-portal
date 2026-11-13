-- =====================================================================
-- 03_procedures.sql  —  Stored functions & procedures for statistics
--                       and scheduled maintenance
-- =====================================================================

-- ---------------------------------------------------------------------
-- Department-wise placement statistics (live computation)
--   p_graduation_year NULL = all batches
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_department_placement_stats(p_graduation_year INT DEFAULT NULL)
RETURNS TABLE (
    department_id         INT,
    department_code       VARCHAR,
    department_name       VARCHAR,
    total_students        BIGINT,
    placed_students       BIGINT,
    placement_percentage  NUMERIC,
    average_ctc           NUMERIC,
    median_ctc            NUMERIC,
    highest_ctc           NUMERIC,
    lowest_ctc            NUMERIC,
    total_offers          BIGINT
)
LANGUAGE sql STABLE AS $$
    WITH cohort AS (
        SELECT s.student_id, s.department_id, s.placement_status, o.ctc_lpa AS accepted_ctc
          FROM students s
          JOIN users u       ON u.user_id = s.student_id AND u.verification_status = 'VERIFIED'
          LEFT JOIN offers o ON o.offer_id = s.placed_offer_id
         WHERE p_graduation_year IS NULL OR s.graduation_year = p_graduation_year
    ),
    offers_made AS (
        SELECT c.department_id, count(*) AS n
          FROM offers o
          JOIN applications a ON a.application_id = o.application_id
          JOIN cohort c       ON c.student_id = a.student_id
         WHERE o.status <> 'REVOKED'
         GROUP BY c.department_id
    )
    SELECT d.department_id,
           d.code,
           d.name,
           count(c.student_id)                                               AS total_students,
           count(c.student_id) FILTER (WHERE c.placement_status = 'PLACED')  AS placed_students,
           round(100.0 * count(c.student_id) FILTER (WHERE c.placement_status = 'PLACED')
                 / NULLIF(count(c.student_id), 0), 2)                        AS placement_percentage,
           round(avg(c.accepted_ctc), 2)                                     AS average_ctc,
           round((percentile_cont(0.5) WITHIN GROUP (ORDER BY c.accepted_ctc))::NUMERIC, 2) AS median_ctc,
           max(c.accepted_ctc)                                               AS highest_ctc,
           min(c.accepted_ctc)                                               AS lowest_ctc,
           COALESCE(max(om.n), 0)                                            AS total_offers
      FROM departments d
      LEFT JOIN cohort c       ON c.department_id = d.department_id
      LEFT JOIN offers_made om ON om.department_id = d.department_id
     GROUP BY d.department_id, d.code, d.name
     ORDER BY d.code;
$$;

-- ---------------------------------------------------------------------
-- STORED PROCEDURE: recompute and persist the department statistics
--   CALL sp_refresh_placement_stats(2027);   -- one batch
--   CALL sp_refresh_placement_stats(NULL);   -- all batches (stored as 0)
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_refresh_placement_stats(p_graduation_year INT DEFAULT NULL)
LANGUAGE plpgsql AS $$
DECLARE
    v_scope SMALLINT := COALESCE(p_graduation_year, 0);
BEGIN
    DELETE FROM placement_stats_snapshot WHERE graduation_year = v_scope;

    INSERT INTO placement_stats_snapshot (
        department_id, graduation_year, total_students, placed_students,
        placement_percentage, average_ctc, median_ctc, highest_ctc, lowest_ctc,
        total_offers, computed_at)
    SELECT f.department_id, v_scope, f.total_students, f.placed_students,
           f.placement_percentage, f.average_ctc, f.median_ctc, f.highest_ctc, f.lowest_ctc,
           f.total_offers, now()
      FROM fn_department_placement_stats(p_graduation_year) AS f;

    RAISE NOTICE 'Placement statistics refreshed for scope %', v_scope;
END $$;

-- ---------------------------------------------------------------------
-- Institute-wide summary (single row)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_overall_placement_summary(p_graduation_year INT DEFAULT NULL)
RETURNS TABLE (
    total_students        BIGINT,
    placed_students       BIGINT,
    placement_percentage  NUMERIC,
    average_ctc           NUMERIC,
    median_ctc            NUMERIC,
    highest_ctc           NUMERIC,
    total_offers          BIGINT,
    pending_offers        BIGINT,
    total_applications    BIGINT,
    participating_companies BIGINT,
    open_jobs             BIGINT
)
LANGUAGE sql STABLE AS $$
    WITH cohort AS (
        SELECT s.student_id, s.placement_status, o.ctc_lpa AS accepted_ctc
          FROM students s
          JOIN users u       ON u.user_id = s.student_id AND u.verification_status = 'VERIFIED'
          LEFT JOIN offers o ON o.offer_id = s.placed_offer_id
         WHERE p_graduation_year IS NULL OR s.graduation_year = p_graduation_year
    ),
    cohort_apps AS (
        SELECT a.* FROM applications a JOIN cohort c ON c.student_id = a.student_id
    )
    SELECT
        (SELECT count(*) FROM cohort),
        (SELECT count(*) FROM cohort WHERE placement_status = 'PLACED'),
        (SELECT round(100.0 * count(*) FILTER (WHERE placement_status = 'PLACED') / NULLIF(count(*), 0), 2) FROM cohort),
        (SELECT round(avg(accepted_ctc), 2) FROM cohort),
        (SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY accepted_ctc))::NUMERIC, 2) FROM cohort),
        (SELECT max(accepted_ctc) FROM cohort),
        (SELECT count(*) FROM offers o JOIN cohort_apps ca ON ca.application_id = o.application_id WHERE o.status <> 'REVOKED'),
        (SELECT count(*) FROM offers o JOIN cohort_apps ca ON ca.application_id = o.application_id WHERE o.status = 'PENDING'),
        (SELECT count(*) FROM cohort_apps),
        (SELECT count(DISTINCT r.company_name)
           FROM job_postings j JOIN recruiters r ON r.recruiter_id = j.recruiter_id
          WHERE j.status IN ('OPEN', 'CLOSED')),
        (SELECT count(*) FROM job_postings WHERE status = 'OPEN');
$$;

-- ---------------------------------------------------------------------
-- Company-wise hiring statistics
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_company_hiring_stats(p_graduation_year INT DEFAULT NULL)
RETURNS TABLE (
    company_name   VARCHAR,
    jobs_posted    BIGINT,
    applications   BIGINT,
    offers_made    BIGINT,
    hires          BIGINT,
    average_ctc    NUMERIC,
    highest_ctc    NUMERIC
)
LANGUAGE sql STABLE AS $$
    WITH apps AS (
        SELECT a.application_id, a.job_id, a.status
          FROM applications a
          JOIN students s ON s.student_id = a.student_id
         WHERE p_graduation_year IS NULL OR s.graduation_year = p_graduation_year
    )
    SELECT r.company_name,
           count(DISTINCT j.job_id)                                        AS jobs_posted,
           count(DISTINCT ap.application_id)                               AS applications,
           count(DISTINCT o.offer_id) FILTER (WHERE o.status <> 'REVOKED') AS offers_made,
           count(DISTINCT o.offer_id) FILTER (WHERE o.status = 'ACCEPTED') AS hires,
           round(avg(o.ctc_lpa) FILTER (WHERE o.status = 'ACCEPTED'), 2)   AS average_ctc,
           max(o.ctc_lpa) FILTER (WHERE o.status = 'ACCEPTED')             AS highest_ctc
      FROM recruiters r
      JOIN job_postings j ON j.recruiter_id = r.recruiter_id AND j.status IN ('OPEN', 'CLOSED')
      LEFT JOIN apps ap   ON ap.job_id = j.job_id
      LEFT JOIN offers o  ON o.application_id = ap.application_id
     GROUP BY r.company_name
     ORDER BY hires DESC, offers_made DESC, r.company_name;
$$;

-- ---------------------------------------------------------------------
-- Hiring funnel for one job (recruiter dashboard)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_job_funnel(p_job_id INT)
RETURNS TABLE (status application_status, total BIGINT)
LANGUAGE sql STABLE AS $$
    SELECT st.status, count(a.application_id)
      FROM unnest(enum_range(NULL::application_status)) AS st(status)
      LEFT JOIN applications a ON a.status = st.status AND a.job_id = p_job_id
     GROUP BY st.status
     ORDER BY st.status;
$$;

-- ---------------------------------------------------------------------
-- STORED PROCEDURE: periodic maintenance
--   * closes OPEN jobs whose application deadline has passed
--   * expires PENDING offers whose response deadline has passed
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_run_maintenance()
LANGUAGE plpgsql AS $$
DECLARE
    v_closed  INT;
    v_expired INT;
BEGIN
    UPDATE job_postings
       SET status = 'CLOSED', closed_reason = 'DEADLINE_PASSED', closed_at = now()
     WHERE status = 'OPEN'
       AND application_deadline IS NOT NULL
       AND application_deadline < CURRENT_DATE;
    GET DIAGNOSTICS v_closed = ROW_COUNT;

    PERFORM set_config('app.status_note', 'Offer expired without a response', true);

    WITH expired AS (
        UPDATE offers
           SET status = 'EXPIRED'
         WHERE status = 'PENDING' AND respond_by < CURRENT_DATE
        RETURNING application_id
    )
    UPDATE applications a
       SET status = 'WITHDRAWN'
      FROM expired e
     WHERE a.application_id = e.application_id
       AND a.status = 'OFFERED';
    GET DIAGNOSTICS v_expired = ROW_COUNT;

    PERFORM set_config('app.status_note', '', true);

    RAISE NOTICE 'Maintenance: % job(s) closed, % offer(s) expired', v_closed, v_expired;
END $$;
