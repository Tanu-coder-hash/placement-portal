'use server';

import { revalidatePath } from 'next/cache';
import { requireActionUser } from '@/lib/auth';
import { AppError, runAction } from '@/lib/errors';
import { parseList } from '@/lib/format';
import { date, id, num, oneOf, str } from '@/lib/validation';
import { closeJob, createJob, recruiterOwnsJob } from '@/lib/services/jobs';
import { recruiterSetApplicationStatus } from '@/lib/services/applications';
import { cancelInterview, recordInterviewOutcome, scheduleInterview } from '@/lib/services/interviews';
import { issueOffer } from '@/lib/services/offers';
import { refreshJobEmbedding } from '@/lib/services/indexing';

function refresh() {
  revalidatePath('/recruiter', 'layout');
}

async function verifiedRecruiter() {
  return requireActionUser('RECRUITER', { verified: true });
}

export async function createJobAction(formData) {
  return runAction(async () => {
    const user = await verifiedRecruiter();
    const ctcLpa = num(formData, 'ctcLpa', { label: 'CTC', required: true, min: 0, max: 9999 });
    const minCgpa = num(formData, 'minCgpa', { label: 'Minimum CGPA', min: 0, max: 10 }) ?? 0;
    const maxApplications = num(formData, 'maxApplications', {
      label: 'Maximum applications',
      integer: true,
      min: 1,
      max: 100000,
    });
    const hiringQuota =
      num(formData, 'hiringQuota', { label: 'Hiring quota', integer: true, min: 1, max: 10000 }) ?? 1;
    if (maxApplications !== null && maxApplications < hiringQuota) {
      throw new AppError('Maximum applications cannot be lower than the hiring quota.');
    }
    const departmentIds = formData
      .getAll('departmentIds')
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v > 0);

    const { jobId, indexed } = await createJob(user.user_id, {
      title: str(formData, 'title', { label: 'Job title', required: true, max: 150 }),
      description: str(formData, 'description', { label: 'Description', required: true, min: 50, max: 20000 }),
      requirements: str(formData, 'requirements', { label: 'Requirements', required: true, min: 20, max: 20000 }),
      requiredSkills: parseList(formData.get('requiredSkills')),
      jobType: oneOf(formData, 'jobType', ['FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO'], {
        label: 'Job type',
        fallback: 'FULL_TIME',
      }),
      location: str(formData, 'location', { label: 'Location', max: 120 }),
      ctcLpa,
      minCgpa,
      maxApplications,
      hiringQuota,
      applicationDeadline: date(formData, 'applicationDeadline', { label: 'Application deadline', notPast: true }),
      departmentIds,
    });
    refresh();
    revalidatePath('/admin', 'layout');
    return {
      redirect: `/recruiter/jobs/${jobId}`,
      message: indexed ? 'Job submitted for approval.' : 'Job submitted, but the AI index could not be updated yet.',
    };
  });
}

export async function closeJobAction(jobId) {
  return runAction(async () => {
    const user = await verifiedRecruiter();
    await closeJob(id(jobId, 'job'), { recruiterId: user.user_id, reason: 'CLOSED_BY_RECRUITER' });
    refresh();
    return { message: 'Job closed to new applications.' };
  });
}

export async function reindexJobAction(jobId) {
  return runAction(async () => {
    const user = await verifiedRecruiter();
    const jid = id(jobId, 'job');
    if (!(await recruiterOwnsJob(user.user_id, jid))) throw new AppError('Job not found.');
    await refreshJobEmbedding(jid);
    refresh();
    return { message: 'Job re-indexed for AI matching.' };
  });
}

export async function shortlistAction(applicationId) {
  return runAction(async () => {
    const user = await verifiedRecruiter();
    await recruiterSetApplicationStatus(user.user_id, id(applicationId, 'application'), 'SHORTLISTED');
    refresh();
    return { message: 'Candidate shortlisted.' };
  });
}

export async function rejectApplicationAction(applicationId) {
  return runAction(async () => {
    const user = await verifiedRecruiter();
    await recruiterSetApplicationStatus(user.user_id, id(applicationId, 'application'), 'REJECTED');
    refresh();
    return { message: 'Application rejected.' };
  });
}

export async function scheduleInterviewAction(formData) {
  return runAction(async () => {
    const user = await verifiedRecruiter();
    const applicationId = id(formData.get('applicationId'), 'application');
    const scheduledRaw = str(formData, 'scheduledAt', { label: 'Interview date & time', required: true, max: 40 });
    const scheduledAt = new Date(scheduledRaw);
    if (Number.isNaN(scheduledAt.getTime())) throw new AppError('Please pick a valid interview date and time.');

    const { roundNumber } = await scheduleInterview(user.user_id, applicationId, {
      roundName: str(formData, 'roundName', { label: 'Round name', required: true, max: 80 }),
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: num(formData, 'durationMinutes', { label: 'Duration', integer: true, min: 10, max: 480 }) ?? 45,
      mode: oneOf(formData, 'mode', ['ONLINE', 'ONSITE', 'PHONE'], { label: 'Mode', fallback: 'ONLINE' }),
      locationOrLink: str(formData, 'locationOrLink', { label: 'Location / link', max: 300 }),
    });
    refresh();
    return { message: `Round ${roundNumber} scheduled.` };
  });
}

export async function recordInterviewAction(formData) {
  return runAction(async () => {
    const user = await verifiedRecruiter();
    await recordInterviewOutcome(user.user_id, id(formData.get('interviewId'), 'interview'), {
      result: oneOf(formData, 'result', ['PASSED', 'FAILED'], { label: 'Result' }),
      feedback: str(formData, 'feedback', { label: 'Feedback', max: 3000 }),
    });
    refresh();
    return { message: 'Interview outcome recorded.' };
  });
}

export async function cancelInterviewAction(interviewId) {
  return runAction(async () => {
    const user = await verifiedRecruiter();
    await cancelInterview(user.user_id, id(interviewId, 'interview'));
    refresh();
    return { message: 'Interview cancelled.' };
  });
}

export async function issueOfferAction(formData) {
  return runAction(async () => {
    const user = await verifiedRecruiter();
    await issueOffer(user.user_id, id(formData.get('applicationId'), 'application'), {
      ctcLpa: num(formData, 'ctcLpa', { label: 'Offered CTC', required: true, min: 0.01, max: 9999 }),
      joiningDate: date(formData, 'joiningDate', { label: 'Joining date', notPast: true }),
      respondBy: date(formData, 'respondBy', { label: 'Respond-by date', notPast: true }),
      notes: str(formData, 'notes', { label: 'Notes', max: 2000 }),
    });
    refresh();
    return { message: 'Offer sent to the candidate.' };
  });
}
