// Interview scheduling. Overlap / future-time checks live in trigger fn_validate_interview.
import { many, one, setStatusNote, withTransaction } from '../db.js';
import { AppError } from '../errors.js';

async function lockOwnedApplication(client, recruiterId, applicationId) {
  const {
    rows: [app],
  } = await client.query(
    `SELECT a.application_id, a.status, a.student_id, j.recruiter_id
       FROM applications a JOIN job_postings j ON j.job_id = a.job_id
      WHERE a.application_id = $1
        FOR UPDATE OF a`,
    [applicationId],
  );
  if (!app || app.recruiter_id !== recruiterId) throw new AppError('Application not found.');
  return app;
}

/**
 * Schedules the next interview round inside one transaction:
 *   lock application -> compute next round number -> insert interview
 *   -> move application to INTERVIEWING (if it was APPLIED / SHORTLISTED)
 */
export async function scheduleInterview(recruiterId, applicationId, input) {
  return withTransaction(
    async (client) => {
      const app = await lockOwnedApplication(client, recruiterId, applicationId);
      if (!['APPLIED', 'SHORTLISTED', 'INTERVIEWING'].includes(app.status)) {
        throw new AppError(`Cannot schedule an interview for an application that is ${app.status.toLowerCase()}.`);
      }
      const {
        rows: [{ next_round }],
      } = await client.query(
        'SELECT COALESCE(max(round_number), 0) + 1 AS next_round FROM interviews WHERE application_id = $1',
        [applicationId],
      );
      const {
        rows: [interview],
      } = await client.query(
        `INSERT INTO interviews (application_id, round_number, round_name, scheduled_at, duration_minutes, mode, location_or_link)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING interview_id, round_number`,
        [
          applicationId,
          next_round,
          input.roundName,
          input.scheduledAt,
          input.durationMinutes,
          input.mode,
          input.locationOrLink,
        ],
      );
      if (app.status !== 'INTERVIEWING') {
        await setStatusNote(client, `Interview round ${next_round} (${input.roundName}) scheduled`);
        await client.query(`UPDATE applications SET status = 'INTERVIEWING' WHERE application_id = $1`, [
          applicationId,
        ]);
      }
      return { interviewId: interview.interview_id, roundNumber: interview.round_number };
    },
    { userId: recruiterId, role: 'RECRUITER' },
  );
}

async function updateOwnedInterview(recruiterId, interviewId, sql, params) {
  const row = await one(
    `${sql}
       AND interview_id = $1
       AND EXISTS (SELECT 1 FROM applications a JOIN job_postings j ON j.job_id = a.job_id
                    WHERE a.application_id = interviews.application_id AND j.recruiter_id = $2)
     RETURNING interview_id`,
    [interviewId, recruiterId, ...params],
  );
  if (!row) throw new AppError('Interview not found or already finalised.');
}

export async function recordInterviewOutcome(recruiterId, interviewId, { result, feedback }) {
  if (!['PASSED', 'FAILED'].includes(result)) throw new AppError('Choose Passed or Failed.');
  await updateOwnedInterview(
    recruiterId,
    interviewId,
    `UPDATE interviews SET status = 'COMPLETED', result = $3, feedback = $4
      WHERE status = 'SCHEDULED'`,
    [result, feedback],
  );
}

export async function cancelInterview(recruiterId, interviewId) {
  await updateOwnedInterview(
    recruiterId,
    interviewId,
    `UPDATE interviews SET status = 'CANCELLED' WHERE status = 'SCHEDULED'`,
    [],
  );
}

export async function listInterviewsForJob(jobId) {
  return many(
    `SELECT i.*, a.student_id, u.full_name
       FROM interviews i
       JOIN applications a ON a.application_id = i.application_id
       JOIN users u        ON u.user_id = a.student_id
      WHERE a.job_id = $1
      ORDER BY i.scheduled_at`,
    [jobId],
  );
}

export async function listInterviewsForRecruiter(recruiterId) {
  return many(
    `SELECT i.interview_id, i.application_id, i.round_number, i.round_name, i.scheduled_at,
            i.duration_minutes, i.mode, i.location_or_link, i.status, i.result, i.feedback,
            a.status AS application_status, j.job_id, j.title AS job_title,
            u.full_name AS student_name, u.email AS student_email, s.roll_number, d.code AS department_code
       FROM interviews i
       JOIN applications a ON a.application_id = i.application_id
       JOIN job_postings j ON j.job_id = a.job_id
       JOIN students s     ON s.student_id = a.student_id
       JOIN users u        ON u.user_id = s.student_id
       JOIN departments d  ON d.department_id = s.department_id
      WHERE j.recruiter_id = $1
      ORDER BY (i.status = 'SCHEDULED') DESC, i.scheduled_at`,
    [recruiterId],
  );
}

export async function listUpcomingInterviewsForStudent(studentId, limit = 5) {
  return many(
    `SELECT i.interview_id, i.round_name, i.round_number, i.scheduled_at, i.duration_minutes, i.mode,
            i.location_or_link, j.title AS job_title, r.company_name
       FROM interviews i
       JOIN applications a ON a.application_id = i.application_id
       JOIN job_postings j ON j.job_id = a.job_id
       JOIN recruiters r   ON r.recruiter_id = j.recruiter_id
      WHERE a.student_id = $1 AND i.status = 'SCHEDULED' AND i.scheduled_at > now()
      ORDER BY i.scheduled_at
      LIMIT $2`,
    [studentId, limit],
  );
}
