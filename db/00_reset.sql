-- =====================================================================
-- 00_reset.sql  —  Drops every object created by this project.
-- Run by `npm run db:setup` before re-creating the schema.
-- WARNING: this deletes all portal data.
-- =====================================================================

DROP VIEW IF EXISTS v_application_overview CASCADE;
DROP VIEW IF EXISTS v_student_directory CASCADE;

DROP TABLE IF EXISTS placement_stats_snapshot      CASCADE;
DROP TABLE IF EXISTS project_embeddings            CASCADE;
DROP TABLE IF EXISTS job_embeddings                CASCADE;
DROP TABLE IF EXISTS student_embeddings            CASCADE;
DROP TABLE IF EXISTS application_status_history    CASCADE;
DROP TABLE IF EXISTS interviews                    CASCADE;
DROP TABLE IF EXISTS offers                        CASCADE;
DROP TABLE IF EXISTS applications                  CASCADE;
DROP TABLE IF EXISTS job_eligible_departments      CASCADE;
DROP TABLE IF EXISTS job_postings                  CASCADE;
DROP TABLE IF EXISTS student_projects              CASCADE;
DROP TABLE IF EXISTS recruiters                    CASCADE;
DROP TABLE IF EXISTS students                      CASCADE;
DROP TABLE IF EXISTS users                         CASCADE;
DROP TABLE IF EXISTS departments                   CASCADE;

DROP PROCEDURE IF EXISTS sp_refresh_placement_stats(INT);
DROP PROCEDURE IF EXISTS sp_run_maintenance();
DROP FUNCTION  IF EXISTS fn_department_placement_stats(INT);
DROP FUNCTION  IF EXISTS fn_overall_placement_summary(INT);
DROP FUNCTION  IF EXISTS fn_company_hiring_stats(INT);
DROP FUNCTION  IF EXISTS fn_job_funnel(INT);

DROP FUNCTION IF EXISTS fn_set_updated_at()                 CASCADE;
DROP FUNCTION IF EXISTS fn_validate_application()           CASCADE;
DROP FUNCTION IF EXISTS fn_enforce_application_transition() CASCADE;
DROP FUNCTION IF EXISTS fn_log_application_status()         CASCADE;
DROP FUNCTION IF EXISTS fn_auto_close_job()                 CASCADE;
DROP FUNCTION IF EXISTS fn_validate_interview()             CASCADE;
DROP FUNCTION IF EXISTS fn_validate_offer()                 CASCADE;
DROP FUNCTION IF EXISTS fn_lock_placed_student()            CASCADE;

DROP TYPE IF EXISTS offer_status;
DROP TYPE IF EXISTS interview_result;
DROP TYPE IF EXISTS interview_status;
DROP TYPE IF EXISTS interview_mode;
DROP TYPE IF EXISTS application_status;
DROP TYPE IF EXISTS job_status;
DROP TYPE IF EXISTS job_type;
DROP TYPE IF EXISTS placement_status;
DROP TYPE IF EXISTS verification_status;
DROP TYPE IF EXISTS user_role;
