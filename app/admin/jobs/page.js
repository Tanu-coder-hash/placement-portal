import ActionButton from '@/components/ActionButton';
import ActionForm from '@/components/ActionForm';
import { Card, DefinitionList, EmptyState, PageHeader, SkillChips, StatusBadge } from '@/components/ui';
import { adminCloseJobAction, reviewJobAction } from '@/app/actions/admin';
import { requireUser } from '@/lib/auth';
import { CLOSED_REASON_LABELS, JOB_TYPE_LABELS, formatCtc, formatDate } from '@/lib/format';
import { listJobsForAdmin } from '@/lib/services/jobs';

export const dynamic = 'force-dynamic';

function ReviewForm({ jobId }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ActionForm action={reviewJobAction} submitLabel="Approve & publish" pendingLabel="Approving…" submitClassName="btn-success btn-sm" className="space-y-2">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="decision" value="APPROVE" />
        <input name="note" className="input" placeholder="Optional note" maxLength={1000} />
      </ActionForm>
      <ActionForm action={reviewJobAction} submitLabel="Reject" pendingLabel="Rejecting…" submitClassName="btn-danger btn-sm" className="space-y-2">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="decision" value="REJECT" />
        <input name="note" className="input" placeholder="Reason (shown to the recruiter)" required maxLength={1000} />
      </ActionForm>
    </div>
  );
}

export default async function AdminJobsPage() {
  await requireUser('ADMIN');
  const jobs = await listJobsForAdmin();
  const pending = jobs.filter((j) => j.status === 'PENDING_APPROVAL');
  const others = jobs.filter((j) => j.status !== 'PENDING_APPROVAL');

  return (
    <div className="space-y-6">
      <PageHeader title="Job approvals" subtitle="Approved postings become visible to eligible students and enter the AI matching pool." />

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Awaiting approval ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState title="All caught up" description="No postings are waiting for review." />
        ) : (
          pending.map((job) => (
            <Card key={job.job_id} title={job.title} description={`${job.company_name} · posted by ${job.recruiter_name} on ${formatDate(job.created_at)}`}>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2">
                  <p className="whitespace-pre-line text-sm text-slate-700">{job.description}</p>
                  <p className="whitespace-pre-line text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Requirements: </span>
                    {job.requirements}
                  </p>
                  <SkillChips skills={job.required_skills} max={20} />
                </div>
                <DefinitionList
                  items={[
                    ['Type', JOB_TYPE_LABELS[job.job_type]],
                    ['CTC', formatCtc(job.ctc_lpa)],
                    ['Location', job.location],
                    ['Min CGPA', job.min_cgpa],
                    ['Quota', job.hiring_quota],
                    ['Max applications', job.max_applications ?? 'Unlimited'],
                    ['Deadline', formatDate(job.application_deadline)],
                    ['Departments', job.eligible_departments.length ? job.eligible_departments.join(', ') : 'All'],
                  ]}
                />
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <ReviewForm jobId={job.job_id} />
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">All postings</h2>
        {others.length === 0 ? (
          <p className="text-sm text-slate-500">No reviewed postings yet.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Status</th>
                  <th className="text-right">Applications</th>
                  <th className="text-right">Hired / quota</th>
                  <th>CTC</th>
                  <th>Deadline</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {others.map((job) => (
                  <tr key={job.job_id}>
                    <td>
                      <div className="font-medium text-slate-900">{job.title}</div>
                      <div className="text-xs text-slate-500">{job.company_name}</div>
                    </td>
                    <td>
                      <StatusBadge status={job.status} />
                      {job.closed_reason ? <div className="mt-1 text-xs text-slate-500">{CLOSED_REASON_LABELS[job.closed_reason]}</div> : null}
                    </td>
                    <td className="text-right tabular-nums">
                      {job.application_count}
                      {job.max_applications ? ` / ${job.max_applications}` : ''}
                    </td>
                    <td className="text-right tabular-nums">
                      {job.hired_count} / {job.hiring_quota}
                    </td>
                    <td>{formatCtc(job.ctc_lpa)}</td>
                    <td>{formatDate(job.application_deadline)}</td>
                    <td className="text-right">
                      {job.status === 'OPEN' ? (
                        <ActionButton action={adminCloseJobAction} args={[job.job_id]} className="btn-ghost btn-sm" confirm={`Close "${job.title}"?`}>
                          Close
                        </ActionButton>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
