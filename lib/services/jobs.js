// Job postings: creation, approval workflow, listing.
import { many, one, withTransaction } from '../db.js';
import { AppError } from '../errors.js';
import { refreshJobEmbedding, safeIndex } from './indexing.js';

const JOB_COLUMNS = `
  j.job_id, j.recruiter_id, j.title, j.description, j.requirements, j.required_skills,
  j.job_type, j.location, j.ctc_lpa, j.min_cgpa, j.max_applications, j.hiring_quota,
  j.application_deadline, j.status, j.closed_reason, j.closed_at, j.review_note,
  j.reviewed_at, j.created_at, j.updated_at,
  r.company_name, r.company_website, r.company_description, ru.full_name AS recruiter_name,
  COALESCE((SELECT array_agg(d.code ORDER BY d.code)
              FROM job_eligible_departments jd
              JOIN departments d ON d.department_id = jd.department_id
             WHERE jd.job_id = j.job_id), '{}') AS eligible_departments,
  (SELECT count(*) FROM applications a WHERE a.job_id = j.job_id AND a.status <> 'WITHDRAWN') AS application_count,
  (SELECT count(*) FROM applications a WHERE a.job_id = j.job_id AND a.status = 'ACCEPTED')   AS hired_count,
  (je.job_id IS NOT NULL) AS indexed`;

const JOB_FROM = `
  FROM job_postings j
  JOIN recruiters r  ON r.recruiter_id = j.recruiter_id
  JOIN users ru      ON ru.user_id = r.recruiter_id
  LEFT JOIN job_embeddings je ON je.job_id = j.job_id`;

export async function createJob(recruiterId, data) {
  const job = await withTransaction(
    async (client) => {
      const {
        rows: [row],
      } = await client.query(
        `INSERT INTO job_postings
           (recruiter_id, title, description, requirements, required_skills, job_type, location,
            ctc_lpa, min_cgpa, max_applications, hiring_quota, application_deadline)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING job_id`,
        [
          recruiterId,
          data.title,
          data.description,
          data.requirements,
          data.requiredSkills,
          data.jobType,
          data.location,
          data.ctcLpa,
          data.minCgpa ?? 0,
          data.maxApplications,
          data.hiringQuota ?? 1,
          data.applicationDeadline,
        ],
      );
      if (data.departmentIds?.length) {
        await client.query(
          `INSERT INTO job_eligible_departments (job_id, department_id)
           SELECT $1, unnest($2::int[])`,
          [row.job_id, data.departmentIds],
        );
      }
      return row;
    },
    { userId: recruiterId, role: 'RECRUITER' },
  );
  const indexed = await safeIndex(`job ${job.job_id}`, () => refreshJobEmbedding(job.job_id));
  return { jobId: job.job_id, indexed };
}

export async function getJob(jobId) {
  return one(`SELECT ${JOB_COLUMNS} ${JOB_FROM} WHERE j.job_id = $1`, [jobId]);
}

export async function listJobsForRecruiter(recruiterId) {
  return many(`SELECT ${JOB_COLUMNS} ${JOB_FROM} WHERE j.recruiter_id = $1 ORDER BY j.created_at DESC`, [
    recruiterId,
  ]);
}

export async function listJobsForAdmin({ status = null } = {}) {
  return many(
    `SELECT ${JOB_COLUMNS} ${JOB_FROM}
      WHERE ($1::job_status IS NULL OR j.status = $1)
      ORDER BY (j.status = 'PENDING_APPROVAL') DESC, j.created_at DESC
      LIMIT 300`,
    [status],
  );
}

/** decision: 'APPROVE' | 'REJECT' — only PENDING_APPROVAL postings can be reviewed. */
export async function reviewJob(adminId, jobId, decision, note = null) {
  const status = decision === 'APPROVE' ? 'OPEN' : decision === 'REJECT' ? 'REJECTED' : null;
  if (!status) throw new AppError('Invalid decision.');
  const row = await one(
    `UPDATE job_postings
        SET status = $2::job_status, reviewed_by = $3, reviewed_at = now(), review_note = $4
      WHERE job_id = $1 AND status = 'PENDING_APPROVAL'
      RETURNING job_id`,
    [jobId, status, adminId, note],
  );
  if (!row) throw new AppError('This job posting is no longer awaiting approval.');
}

/** Recruiters can close their own postings; admins (recruiterId = null) can close any. */
export async function closeJob(jobId, { recruiterId = null, reason = 'CLOSED_BY_RECRUITER' } = {}) {
  const row = await one(
    `UPDATE job_postings
        SET status = 'CLOSED', closed_reason = $2, closed_at = now()
      WHERE job_id = $1 AND status = 'OPEN' AND ($3::int IS NULL OR recruiter_id = $3)
      RETURNING job_id`,
    [jobId, reason, recruiterId],
  );
  if (!row) throw new AppError('Only open jobs that you own can be closed.');
}

export async function recruiterOwnsJob(recruiterId, jobId) {
  const row = await one('SELECT 1 FROM job_postings WHERE job_id = $1 AND recruiter_id = $2', [jobId, recruiterId]);
  return Boolean(row);
}
