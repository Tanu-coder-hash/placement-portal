-- =====================================================================
-- 04_views.sql  —  Read-only views used by the dashboards
-- =====================================================================

-- One row per application with everything a dashboard needs
CREATE OR REPLACE VIEW v_application_overview AS
SELECT a.application_id,
       a.status          AS application_status,
       a.match_score,
       a.applied_at,
       a.updated_at,
       j.job_id,
       j.title           AS job_title,
       j.job_type,
       j.ctc_lpa         AS job_ctc_lpa,
       j.status          AS job_status,
       r.recruiter_id,
       r.company_name,
       s.student_id,
       su.full_name      AS student_name,
       su.email          AS student_email,
       s.roll_number,
       s.cgpa,
       s.graduation_year,
       d.code            AS department_code,
       o.offer_id,
       o.status          AS offer_status,
       o.ctc_lpa         AS offer_ctc_lpa
  FROM applications a
  JOIN job_postings j  ON j.job_id = a.job_id
  JOIN recruiters r    ON r.recruiter_id = j.recruiter_id
  JOIN students s      ON s.student_id = a.student_id
  JOIN users su        ON su.user_id = s.student_id
  JOIN departments d   ON d.department_id = s.department_id
  LEFT JOIN offers o   ON o.application_id = a.application_id;

-- Student directory (no resume bytes) for admin / recruiter listings
CREATE OR REPLACE VIEW v_student_directory AS
SELECT s.student_id,
       u.full_name,
       u.email,
       u.verification_status,
       s.roll_number,
       s.graduation_year,
       s.cgpa,
       s.headline,
       s.skills,
       s.placement_status,
       d.department_id,
       d.code AS department_code,
       d.name AS department_name,
       (s.resume_text IS NOT NULL AND length(s.resume_text) > 0) AS has_resume,
       (se.student_id IS NOT NULL)                               AS has_embedding,
       se.updated_at                                             AS embedding_updated_at
  FROM students s
  JOIN users u        ON u.user_id = s.student_id
  JOIN departments d  ON d.department_id = s.department_id
  LEFT JOIN student_embeddings se ON se.student_id = s.student_id;
