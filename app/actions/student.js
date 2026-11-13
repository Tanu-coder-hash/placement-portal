'use server';

import { revalidatePath } from 'next/cache';
import { requireActionUser } from '@/lib/auth';
import { AppError, runAction } from '@/lib/errors';
import { parseList } from '@/lib/format';
import { cleanResumeText, extractResume } from '@/lib/resume';
import { id, str, url } from '@/lib/validation';
import { addProject, deleteProject, saveResume, updateStudentProfile } from '@/lib/services/students';
import { refreshProjectEmbedding, refreshStudentEmbedding } from '@/lib/services/indexing';
import { many } from '@/lib/db';
import { applyToJob, withdrawApplication } from '@/lib/services/applications';
import { acceptOffer, declineOffer } from '@/lib/services/offers';

const INDEX_WARNING =
  ' (The AI matching index could not be updated right now — use "Rebuild AI profile" later.)';

function refresh() {
  revalidatePath('/student', 'layout');
}

export async function updateProfileAction(formData) {
  return runAction(async () => {
    const user = await requireActionUser('STUDENT');
    const phone = str(formData, 'phone', { label: 'Phone', max: 20 });
    const headline = str(formData, 'headline', { label: 'Headline', max: 160 });
    const skills = parseList(formData.get('skills'));
    const { indexed } = await updateStudentProfile(user.user_id, { phone, headline, skills });
    refresh();
    return { message: `Profile saved.${indexed ? '' : INDEX_WARNING}` };
  });
}

export async function uploadResumeAction(formData) {
  return runAction(async () => {
    const user = await requireActionUser('STUDENT');
    const resume = await extractResume(formData.get('resume'));
    const { indexed } = await saveResume(user.user_id, resume);
    refresh();
    return {
      message: `Resume uploaded — ${resume.text.length.toLocaleString('en-IN')} characters extracted.${indexed ? '' : INDEX_WARNING}`,
    };
  });
}

export async function saveResumeTextAction(formData) {
  return runAction(async () => {
    const user = await requireActionUser('STUDENT');
    const text = cleanResumeText(formData.get('resumeText'));
    if (text.length < 80) throw new AppError('Please paste at least a few lines of resume text.');
    const { indexed } = await saveResume(user.user_id, { text });
    refresh();
    return { message: `Resume text saved.${indexed ? '' : INDEX_WARNING}` };
  });
}

export async function addProjectAction(formData) {
  return runAction(async () => {
    const user = await requireActionUser('STUDENT');
    const title = str(formData, 'title', { label: 'Project title', required: true, max: 150 });
    const summary = str(formData, 'summary', { label: 'Project summary', required: true, min: 30, max: 3000 });
    const techStack = parseList(formData.get('techStack'));
    const projectUrl = url(formData, 'projectUrl', { label: 'Project link' });
    const { indexed } = await addProject(user.user_id, { title, summary, techStack, projectUrl });
    refresh();
    return { message: `Project added.${indexed ? '' : INDEX_WARNING}` };
  });
}

export async function deleteProjectAction(projectId) {
  return runAction(async () => {
    const user = await requireActionUser('STUDENT');
    await deleteProject(user.user_id, id(projectId, 'project'));
    refresh();
    return { message: 'Project removed.' };
  });
}

export async function rebuildMyEmbeddingAction() {
  return runAction(async () => {
    const user = await requireActionUser('STUDENT');
    const projects = await many('SELECT project_id FROM student_projects WHERE student_id = $1', [user.user_id]);
    for (const p of projects) await refreshProjectEmbedding(p.project_id);
    const doc = await refreshStudentEmbedding(user.user_id);
    refresh();
    if (!doc) throw new AppError('Add skills, a project or your resume first — there is nothing to index yet.');
    return { message: `AI profile rebuilt from ${doc.chunkCount} text chunk(s).` };
  });
}

export async function applyToJobAction(formData) {
  return runAction(async () => {
    const user = await requireActionUser('STUDENT', { verified: true });
    const jobId = id(formData.get('jobId'), 'job');
    const coverNote = str(formData, 'coverNote', { label: 'Cover note', max: 2000 });
    const { matchScore } = await applyToJob(user.user_id, jobId, coverNote);
    refresh();
    return {
      message:
        matchScore === null
          ? 'Application submitted.'
          : `Application submitted — your profile is a ${(matchScore * 100).toFixed(0)}% semantic match.`,
    };
  });
}

export async function withdrawApplicationAction(applicationId) {
  return runAction(async () => {
    const user = await requireActionUser('STUDENT');
    await withdrawApplication(user.user_id, id(applicationId, 'application'));
    refresh();
    return { message: 'Application withdrawn.' };
  });
}

export async function acceptOfferAction(offerId) {
  return runAction(async () => {
    const user = await requireActionUser('STUDENT', { verified: true });
    const result = await acceptOffer(user.user_id, id(offerId, 'offer'));
    refresh();
    return {
      message:
        `Congratulations! Offer accepted. ${result.rejectedApplications} other application(s) were closed` +
        ` and ${result.declinedOffers} other offer(s) declined automatically.`,
    };
  });
}

export async function declineOfferAction(offerId) {
  return runAction(async () => {
    const user = await requireActionUser('STUDENT');
    await declineOffer(user.user_id, id(offerId, 'offer'));
    refresh();
    return { message: 'Offer declined.' };
  });
}
