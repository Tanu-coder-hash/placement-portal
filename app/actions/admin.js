'use server';

import { revalidatePath } from 'next/cache';
import { requireActionUser } from '@/lib/auth';
import { AppError, runAction } from '@/lib/errors';
import { id, str } from '@/lib/validation';
import { setVerificationStatus } from '@/lib/services/accounts';
import { closeJob, reviewJob } from '@/lib/services/jobs';
import { refreshPlacementStats, runMaintenance } from '@/lib/services/stats';
import { rebuildAllEmbeddings } from '@/lib/services/indexing';

function refresh() {
  revalidatePath('/', 'layout');
}

export async function verifyUserAction(userId, status) {
  return runAction(async () => {
    const admin = await requireActionUser('ADMIN');
    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) throw new AppError('Invalid status.');
    await setVerificationStatus(admin.user_id, id(userId, 'user'), status);
    refresh();
    return { message: status === 'VERIFIED' ? 'User verified.' : status === 'REJECTED' ? 'User rejected.' : 'Reset to pending.' };
  });
}

export async function reviewJobAction(formData) {
  return runAction(async () => {
    const admin = await requireActionUser('ADMIN');
    const decision = formData.get('decision');
    const note = str(formData, 'note', { label: 'Note', max: 1000 });
    if (decision === 'REJECT' && !note) throw new AppError('Please give a reason when rejecting a job posting.');
    await reviewJob(admin.user_id, id(formData.get('jobId'), 'job'), decision, note);
    refresh();
    return { message: decision === 'APPROVE' ? 'Job approved and now open to students.' : 'Job posting rejected.' };
  });
}

export async function adminCloseJobAction(jobId) {
  return runAction(async () => {
    await requireActionUser('ADMIN');
    await closeJob(id(jobId, 'job'), { recruiterId: null, reason: 'CLOSED_BY_ADMIN' });
    refresh();
    return { message: 'Job closed.' };
  });
}

export async function refreshStatsAction(graduationYear) {
  return runAction(async () => {
    await requireActionUser('ADMIN');
    const year = graduationYear ? id(graduationYear, 'graduation year') : null;
    await refreshPlacementStats(year);
    refresh();
    return { message: 'Statistics recomputed by sp_refresh_placement_stats.' };
  });
}

export async function runMaintenanceAction() {
  return runAction(async () => {
    await requireActionUser('ADMIN');
    await runMaintenance();
    refresh();
    return { message: 'Maintenance complete: expired jobs closed and stale offers expired.' };
  });
}

export async function rebuildEmbeddingsAction() {
  return runAction(async () => {
    await requireActionUser('ADMIN');
    const counts = await rebuildAllEmbeddings();
    refresh();
    return {
      message: `Vector index rebuilt: ${counts.students} students, ${counts.projects} projects, ${counts.jobs} jobs.`,
    };
  });
}
