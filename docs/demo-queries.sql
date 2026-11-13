-- =====================================================================
-- demo-queries.sql — handy statements for a live database demo (psql)
--   docker exec -it placement-portal-db psql -U placement -d placement_portal
-- Run `npm run db:reset` first for a clean demo dataset.
-- =====================================================================

-- ---------- 1. Relational overview ----------
SELECT application_id, student_name, job_title, company_name, application_status, match_score
  FROM v_application_overview ORDER BY job_title, match_score DESC NULLS LAST;

-- ---------- 2. Vector similarity search ----------
-- Top 5 students for the Backend job (cosine similarity, HNSW index)
SELECT u.full_name, d.code AS dept,
       round((1 - (se.embedding <=> je.embedding))::numeric, 3) AS cosine_similarity
  FROM student_embeddings se
  JOIN job_embeddings je ON je.job_id = (SELECT job_id FROM job_postings WHERE title = 'Backend Software Engineer')
  JOIN students s ON s.student_id = se.student_id
  JOIN users u    ON u.user_id = s.student_id
  JOIN departments d ON d.department_id = s.department_id
 ORDER BY se.embedding <=> je.embedding
 LIMIT 5;

-- Show that the HNSW index is used for k-NN ordering
SET enable_seqscan = off;
EXPLAIN SELECT student_id FROM student_embeddings
 ORDER BY embedding <=> (SELECT embedding FROM job_embeddings LIMIT 1) LIMIT 5;
RESET enable_seqscan;

-- ---------- 3. Triggers ----------
-- (a) the SRE posting was auto-closed when its 3rd application arrived
SELECT title, status, closed_reason, max_applications,
       (SELECT count(*) FROM applications a WHERE a.job_id = j.job_id) AS applications
  FROM job_postings j WHERE title LIKE 'Site Reliability%';

-- (b) invalid status transition is rejected
UPDATE applications SET status = 'ACCEPTED'
 WHERE status = 'APPLIED' AND application_id = (SELECT min(application_id) FROM applications WHERE status = 'APPLIED');
-- ERROR:  Invalid application status change: APPLIED -> ACCEPTED.

-- (c) a placed student cannot apply again
INSERT INTO applications (job_id, student_id)
SELECT (SELECT job_id FROM job_postings WHERE title = 'Frontend Engineer (React)'),
       (SELECT user_id FROM users WHERE email = 'aarav.sharma@student.university.edu');
-- ERROR:  You have already accepted an offer. Your placement status is locked ...

-- (d) the placement lock
UPDATE students SET placement_status = 'UNPLACED', placed_at = NULL
 WHERE student_id = (SELECT user_id FROM users WHERE email = 'aarav.sharma@student.university.edu');
-- ERROR:  Placement status is locked once an offer is accepted ...

-- (e) the milestone trail written by the logging trigger
SELECT h.changed_at, u.full_name, h.old_status, h.new_status, h.note
  FROM application_status_history h
  JOIN applications a ON a.application_id = h.application_id
  JOIN users u ON u.user_id = a.student_id
 ORDER BY h.history_id DESC LIMIT 15;

-- ---------- 4. Stored procedures ----------
CALL sp_refresh_placement_stats(NULL);
SELECT d.code, s.total_students, s.placed_students, s.placement_percentage, s.average_ctc, s.median_ctc
  FROM placement_stats_snapshot s JOIN departments d USING (department_id)
 WHERE s.graduation_year = 0 ORDER BY s.placement_percentage DESC;

SELECT * FROM fn_overall_placement_summary(NULL);
SELECT * FROM fn_company_hiring_stats(NULL);
SELECT * FROM fn_job_funnel((SELECT job_id FROM job_postings WHERE title = 'Backend Software Engineer'));
CALL sp_run_maintenance();

-- ---------- 5. The accept-offer transaction (manual version) ----------
-- 1) In the UI: NovaByte makes Rohan an offer for "Backend Software Engineer".
-- 2) Then run (or click Accept as Rohan — the app runs the same statements):
--
-- BEGIN;
-- SELECT set_config('app.user_id', (SELECT user_id::text FROM users WHERE email='rohan.gupta@student.university.edu'), true);
-- SELECT placement_status FROM students WHERE student_id = <rohan_id> FOR UPDATE;
-- UPDATE offers SET status='ACCEPTED', responded_at=now() WHERE offer_id = <offer_id>;
-- UPDATE applications SET status='ACCEPTED' WHERE application_id = <application_id>;
-- UPDATE applications SET status='REJECTED' WHERE student_id = <rohan_id> AND application_id <> <application_id>
--        AND status IN ('APPLIED','SHORTLISTED','INTERVIEWING','OFFERED');
-- UPDATE students SET placement_status='PLACED', placed_offer_id=<offer_id>, placed_at=now() WHERE student_id=<rohan_id>;
-- COMMIT;
--
-- Afterwards the Backend job is CLOSED with closed_reason = 'HIRING_QUOTA_FILLED' (quota 2 reached).
