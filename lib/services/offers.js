// Offers — issuing, accepting (the core ACID transaction) and declining.
import { setStatusNote, withTransaction } from '../db.js';
import { AppError } from '../errors.js';

/**
 * Recruiter issues an offer.
 * Lock order (student -> application) matches acceptOffer() to avoid deadlocks.
 */
export async function issueOffer(recruiterId, applicationId, { ctcLpa, joiningDate, respondBy, notes }) {
  return withTransaction(
    async (client) => {
      const {
        rows: [ref],
      } = await client.query(
        `SELECT a.student_id, j.recruiter_id
           FROM applications a JOIN job_postings j ON j.job_id = a.job_id
          WHERE a.application_id = $1`,
        [applicationId],
      );
      if (!ref || ref.recruiter_id !== recruiterId) throw new AppError('Application not found.');

      // 1. Shared lock on the student: blocks a concurrent acceptOffer() of this student.
      const {
        rows: [student],
      } = await client.query('SELECT placement_status FROM students WHERE student_id = $1 FOR SHARE', [ref.student_id]);
      if (student.placement_status === 'PLACED') {
        throw new AppError('This student has already accepted another offer.');
      }

      // 2. Exclusive lock on the application row.
      const {
        rows: [app],
      } = await client.query('SELECT status FROM applications WHERE application_id = $1 FOR UPDATE', [applicationId]);
      if (!['APPLIED', 'SHORTLISTED', 'INTERVIEWING'].includes(app.status)) {
        throw new AppError(`An offer cannot be made for an application that is ${app.status.toLowerCase()}.`);
      }

      // 3. Insert the offer (trigger fn_validate_offer re-checks the rules).
      const {
        rows: [offer],
      } = await client.query(
        `INSERT INTO offers (application_id, ctc_lpa, joining_date, respond_by, notes)
         VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE + 7), $5)
         RETURNING offer_id`,
        [applicationId, ctcLpa, joiningDate, respondBy, notes],
      );

      // 4. Move the application forward.
      await setStatusNote(client, `Offer issued: ₹${ctcLpa} LPA`);
      await client.query(`UPDATE applications SET status = 'OFFERED' WHERE application_id = $1`, [applicationId]);
      return { offerId: offer.offer_id };
    },
    { userId: recruiterId, role: 'RECRUITER' },
  );
}

/**
 * ACID TRANSACTION — student accepts an offer.
 *
 * All of the following succeed together or not at all:
 *   1. lock the student row (FOR UPDATE) so two acceptances cannot race
 *   2. verify the offer belongs to the student and is still PENDING
 *   3. offer            -> ACCEPTED
 *   4. application      -> ACCEPTED   (trigger may close the job when the hiring quota fills)
 *   5. other offers     -> DECLINED
 *   6. scheduled interviews -> CANCELLED
 *   7. other in-progress applications -> REJECTED
 *   8. student          -> PLACED     (trigger then locks this status)
 */
export async function acceptOffer(studentId, offerId) {
  return withTransaction(
    async (client) => {
      // 1. Exclusive row lock on the student
      const {
        rows: [student],
      } = await client.query('SELECT placement_status FROM students WHERE student_id = $1 FOR UPDATE', [studentId]);
      if (!student) throw new AppError('Student profile not found.');
      if (student.placement_status === 'PLACED') {
        throw new AppError('You have already accepted an offer. Your placement status is locked.');
      }

      // 2. Lock and validate the offer + its application
      const {
        rows: [offer],
      } = await client.query(
        `SELECT o.offer_id, o.status, o.respond_by, o.respond_by < CURRENT_DATE AS is_expired,
                a.application_id, a.job_id, a.student_id
           FROM offers o
           JOIN applications a ON a.application_id = o.application_id
          WHERE o.offer_id = $1
            FOR UPDATE OF o, a`,
        [offerId],
      );
      if (!offer || offer.student_id !== studentId) throw new AppError('Offer not found.');
      if (offer.status !== 'PENDING') throw new AppError(`This offer is already ${offer.status.toLowerCase()}.`);
      if (offer.is_expired) throw new AppError('The response deadline for this offer has passed.');

      // 3. Accept the offer
      await client.query(`UPDATE offers SET status = 'ACCEPTED', responded_at = now() WHERE offer_id = $1`, [offerId]);

      // 4. Accept the application
      await setStatusNote(client, 'Offer accepted by student');
      await client.query(`UPDATE applications SET status = 'ACCEPTED' WHERE application_id = $1`, [
        offer.application_id,
      ]);

      // 5. Decline every other pending offer
      await setStatusNote(client, 'Auto-declined: student accepted another offer');
      const declined = await client.query(
        `UPDATE offers o
            SET status = 'DECLINED', responded_at = now()
           FROM applications a
          WHERE a.application_id = o.application_id
            AND a.student_id = $1
            AND o.offer_id <> $2
            AND o.status = 'PENDING'
         RETURNING o.offer_id`,
        [studentId, offerId],
      );

      // 6. Cancel every interview still scheduled for this student (no longer needed)
      await client.query(
        `UPDATE interviews i
            SET status = 'CANCELLED'
           FROM applications a
          WHERE a.application_id = i.application_id
            AND a.student_id = $1
            AND i.status = 'SCHEDULED'`,
        [studentId],
      );

      // 7. Reject all other pending applications
      await setStatusNote(client, 'Auto-rejected: student accepted another offer');
      const rejected = await client.query(
        `UPDATE applications
            SET status = 'REJECTED'
          WHERE student_id = $1
            AND application_id <> $2
            AND status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED')
         RETURNING application_id`,
        [studentId, offer.application_id],
      );
      await setStatusNote(client, '');

      // 8. Lock the student's placement status
      await client.query(
        `UPDATE students SET placement_status = 'PLACED', placed_offer_id = $2, placed_at = now()
          WHERE student_id = $1`,
        [studentId, offerId],
      );

      return { declinedOffers: declined.rowCount, rejectedApplications: rejected.rowCount };
    },
    { userId: studentId, role: 'STUDENT' },
  );
}

export async function declineOffer(studentId, offerId) {
  return withTransaction(
    async (client) => {
      const {
        rows: [offer],
      } = await client.query(
        `SELECT o.status, a.application_id, a.student_id
           FROM offers o JOIN applications a ON a.application_id = o.application_id
          WHERE o.offer_id = $1
            FOR UPDATE OF o, a`,
        [offerId],
      );
      if (!offer || offer.student_id !== studentId) throw new AppError('Offer not found.');
      if (offer.status !== 'PENDING') throw new AppError(`This offer is already ${offer.status.toLowerCase()}.`);

      await client.query(`UPDATE offers SET status = 'DECLINED', responded_at = now() WHERE offer_id = $1`, [offerId]);
      await setStatusNote(client, 'Offer declined by student');
      await client.query(`UPDATE applications SET status = 'WITHDRAWN' WHERE application_id = $1`, [
        offer.application_id,
      ]);
    },
    { userId: studentId, role: 'STUDENT' },
  );
}
