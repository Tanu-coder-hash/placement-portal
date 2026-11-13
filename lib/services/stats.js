// Placement statistics — thin wrappers over the stored functions / procedures in db/03_procedures.sql
import { many, one, query } from '../db.js';

/** CALL sp_refresh_placement_stats(year)  — year null = all batches */
export async function refreshPlacementStats(graduationYear = null) {
  await query('CALL sp_refresh_placement_stats($1::int)', [graduationYear]);
}

/** CALL sp_run_maintenance() — closes expired jobs, expires stale offers */
export async function runMaintenance() {
  await query('CALL sp_run_maintenance()');
}

/** Reads the snapshot written by the procedure; computes it first if missing. */
export async function getDepartmentStats(graduationYear = null) {
  const scope = graduationYear ?? 0;
  const sql = `SELECT ps.*, d.code AS department_code, d.name AS department_name
                 FROM placement_stats_snapshot ps
                 JOIN departments d ON d.department_id = ps.department_id
                WHERE ps.graduation_year = $1
                ORDER BY ps.placement_percentage DESC NULLS LAST, d.code`;
  let rows = await many(sql, [scope]);
  if (rows.length === 0) {
    await refreshPlacementStats(graduationYear);
    rows = await many(sql, [scope]);
  }
  return rows;
}

export async function getOverallSummary(graduationYear = null) {
  return one('SELECT * FROM fn_overall_placement_summary($1::int)', [graduationYear]);
}

export async function getCompanyStats(graduationYear = null) {
  return many('SELECT * FROM fn_company_hiring_stats($1::int)', [graduationYear]);
}

export async function getJobFunnel(jobId) {
  return many('SELECT status, total FROM fn_job_funnel($1)', [jobId]);
}

export async function getGraduationYears() {
  const rows = await many('SELECT DISTINCT graduation_year FROM students ORDER BY graduation_year DESC');
  return rows.map((r) => r.graduation_year);
}

export async function getRecentActivity(limit = 12) {
  return many(
    `SELECT h.history_id, h.old_status, h.new_status, h.note, h.changed_at,
            u.full_name AS student_name, j.title AS job_title, r.company_name
       FROM application_status_history h
       JOIN applications a ON a.application_id = h.application_id
       JOIN users u        ON u.user_id = a.student_id
       JOIN job_postings j ON j.job_id = a.job_id
       JOIN recruiters r   ON r.recruiter_id = j.recruiter_id
      ORDER BY h.changed_at DESC, h.history_id DESC
      LIMIT $1`,
    [limit],
  );
}

export async function getPendingCounts() {
  return one(
    `SELECT (SELECT count(*) FROM users WHERE verification_status = 'PENDING' AND role <> 'ADMIN') AS pending_users,
            (SELECT count(*) FROM job_postings WHERE status = 'PENDING_APPROVAL')                AS pending_jobs`,
  );
}

export async function getRecruiterSummary(recruiterId) {
  return one(
    `SELECT count(DISTINCT j.job_id)                                              AS jobs,
            count(DISTINCT j.job_id) FILTER (WHERE j.status = 'OPEN')            AS open_jobs,
            count(a.application_id)                                               AS applications,
            count(a.application_id) FILTER (WHERE a.status = 'ACCEPTED')         AS hires,
            (SELECT count(*) FROM interviews i
               JOIN applications a2 ON a2.application_id = i.application_id
               JOIN job_postings j2 ON j2.job_id = a2.job_id
              WHERE j2.recruiter_id = $1 AND i.status = 'SCHEDULED' AND i.scheduled_at > now()) AS upcoming_interviews
       FROM job_postings j
       LEFT JOIN applications a ON a.job_id = j.job_id
      WHERE j.recruiter_id = $1`,
    [recruiterId],
  );
}
