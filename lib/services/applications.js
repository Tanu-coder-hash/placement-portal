// Job applications: apply, withdraw, recruiter status changes, student timeline.
import { many, setStatusNote, withTransaction } from '../db.js';
import { AppError } from '../errors.js';
import { studentJobSimilarity } from './matching.js';

/**
 * Student applies to a job. Eligibility, deadline, placement lock and the
 * max-application limit are enforced by trigger fn_validate_application;
 * the auto-close trigger may close the job in the same transaction.
 */
export async function applyToJob(studentId, jobId, coverNote = null) {
  return withTransaction(
    async (client) => {
      const score = await studentJobSimilarity(studentId, jobId, client);
      const {
        rows: [row],
      } = await client.query(
        `INSERT INTO applications (job_id, student_id, match_score, cover_note)
         VALUES ($1, $2, $3, $4)
         RETURNING application_id`,
        [jobId, studentId, score === null ? null : score.toFixed(4), coverNote],
      );
      return { applicationId: row.application_id, matchScore: score };
    },
    { userId: studentId, role: 'STUDENT' },
  );
}

/** Student withdraws an in-progress application (scheduled interviews are cancelled). */
export async function withdrawApplication(studentId, applicationId) {
  return withTransaction(
    async (client) => {
      const {
        rows: [app],
      } = await client.query(
        'SELECT application_id, student_id, status FROM applications WHERE application_id = $1 FOR UPDATE',
        [applicationId],
      );
      if (!app || app.student_id !== studentId) throw new AppError('Application not found.');
      if (!['APPLIED', 'SHORTLISTED', 'INTERVIEWING'].includes(app.status)) {
        throw new AppError(`An application that is ${app.status.toLowerCase()} cannot be withdrawn.`);
      }
      await client.query(
        `UPDATE interviews SET status = 'CANCELLED' WHERE application_id = $1 AND status = 'SCHEDULED'`,
        [applicationId],
      );
      await setStatusNote(client, 'Withdrawn by student');
      await client.query(`UPDATE applications SET status = 'WITHDRAWN' WHERE application_id = $1`, [applicationId]);
    },
    { userId: studentId, role: 'STUDENT' },
  );
}

/**
 * Recruiter moves an application to SHORTLISTED or REJECTED.
 * Ownership is checked while holding a row lock on the application.
 */
export async function recruiterSetApplicationStatus(recruiterId, applicationId, newStatus, note = null) {
  if (!['SHORTLISTED', 'REJECTED'].includes(newStatus)) throw new AppError('Unsupported status change.');
  return withTransaction(
    async (client) => {
      const {
        rows: [app],
      } = await client.query(
        `SELECT a.application_id, a.status, j.recruiter_id
           FROM applications a JOIN job_postings j ON j.job_id = a.job_id
          WHERE a.application_id = $1
            FOR UPDATE OF a`,
        [applicationId],
      );
      if (!app || app.recruiter_id !== recruiterId) throw new AppError('Application not found.');

      if (newStatus === 'REJECTED') {
        await client.query(
          `UPDATE interviews SET status = 'CANCELLED' WHERE application_id = $1 AND status = 'SCHEDULED'`,
          [applicationId],
        );
        await client.query(
          `UPDATE offers SET status = 'REVOKED' WHERE application_id = $1 AND status = 'PENDING'`,
          [applicationId],
        );
      }
      await setStatusNote(client, note || (newStatus === 'REJECTED' ? 'Rejected by recruiter' : 'Shortlisted by recruiter'));
      await client.query('UPDATE applications SET status = $2 WHERE application_id = $1', [applicationId, newStatus]);
    },
    { userId: recruiterId, role: 'RECRUITER' },
  );
}

/** Everything a student needs to track their applications (milestones, interviews, offers). */
export async function listStudentApplications(studentId) {
  const applications = await many(
    `SELECT a.application_id, a.status, a.applied_at, a.updated_at, a.match_score, a.cover_note,
            j.job_id, j.title, j.job_type, j.location, j.ctc_lpa, j.status AS job_status,
            r.company_name,
            o.offer_id, o.status AS offer_status, o.ctc_lpa AS offer_ctc_lpa, o.joining_date,
            o.respond_by, o.notes AS offer_notes, o.issued_at AS offer_issued_at
       FROM applications a
       JOIN job_postings j ON j.job_id = a.job_id
       JOIN recruiters r   ON r.recruiter_id = j.recruiter_id
       LEFT JOIN offers o  ON o.application_id = a.application_id
      WHERE a.student_id = $1
      ORDER BY a.applied_at DESC`,
    [studentId],
  );
  if (applications.length === 0) return [];

  const ids = applications.map((a) => a.application_id);
  const [history, interviews] = await Promise.all([
    many(
      `SELECT application_id, old_status, new_status, note, changed_at
         FROM application_status_history
        WHERE application_id = ANY($1::int[])
        ORDER BY changed_at, history_id`,
      [ids],
    ),
    many(
      `SELECT interview_id, application_id, round_number, round_name, scheduled_at, duration_minutes,
              mode, location_or_link, status, result, feedback
         FROM interviews
        WHERE application_id = ANY($1::int[])
        ORDER BY round_number`,
      [ids],
    ),
  ]);

  return applications.map((a) => ({
    ...a,
    history: history.filter((h) => h.application_id === a.application_id),
    interviews: interviews.filter((i) => i.application_id === a.application_id),
  }));
}

export async function studentApplicationSummary(studentId) {
  const [row] = await many(
    `SELECT count(*)                                                        AS total,
            count(*) FILTER (WHERE status IN ('APPLIED','SHORTLISTED','INTERVIEWING')) AS in_progress,
            count(*) FILTER (WHERE status = 'OFFERED')                      AS offered,
            count(*) FILTER (WHERE status = 'ACCEPTED')                     AS accepted,
            (SELECT count(*) FROM interviews i JOIN applications a2 ON a2.application_id = i.application_id
              WHERE a2.student_id = $1 AND i.status = 'SCHEDULED' AND i.scheduled_at > now()) AS upcoming_interviews
       FROM applications WHERE student_id = $1`,
    [studentId],
  );
  return row;
}
