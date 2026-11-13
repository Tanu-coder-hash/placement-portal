import Link from 'next/link';
import { EmptyState, PageHeader, Stat, StatusBadge } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { CLOSED_REASON_LABELS, JOB_TYPE_LABELS, formatCtc, formatDate } from '@/lib/format';
import { listJobsForRecruiter } from '@/lib/services/jobs';
import { getRecruiterSummary } from '@/lib/services/stats';

export const dynamic = 'force-dynamic';

export default async function RecruiterDashboard() {
  const user = await requireUser('RECRUITER');
  const [company, jobs, summary] = await Promise.all([
    one('SELECT company_name FROM recruiters WHERE recruiter_id = $1', [user.user_id]),
    listJobsForRecruiter(user.user_id),
    getRecruiterSummary(user.user_id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={company?.company_name || 'My job postings'}
        subtitle="Candidates for every posting are ranked by semantic similarity to your job description."
        actions={
          user.verification_status === 'VERIFIED' ? (
            <Link href="/recruiter/jobs/new" className="btn-primary">
              Post a job
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Postings" value={summary.jobs} hint={`${summary.open_jobs} open`} />
        <Stat label="Applications" value={summary.applications} />
        <Stat label="Upcoming interviews" value={summary.upcoming_interviews} />
        <Stat label="Hires" value={summary.hires} />
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No job postings yet"
          description="Post a role; once the placement office approves it, students see it ranked by fit."
          action={
            user.verification_status === 'VERIFIED' ? (
              <Link href="/recruiter/jobs/new" className="btn-primary">
                Post your first job
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Status</th>
                <th>Applications</th>
                <th>Hired / quota</th>
                <th>CTC</th>
                <th>Deadline</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.job_id}>
                  <td>
                    <div className="font-medium text-slate-900">{job.title}</div>
                    <div className="text-xs text-slate-500">
                      {JOB_TYPE_LABELS[job.job_type]}
                      {job.location ? ` · ${job.location}` : ''}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={job.status} />
                    {job.closed_reason ? (
                      <div className="mt-1 text-xs text-slate-500">{CLOSED_REASON_LABELS[job.closed_reason]}</div>
                    ) : null}
                    {job.status === 'REJECTED' && job.review_note ? (
                      <div className="mt-1 max-w-[14rem] text-xs text-red-600">{job.review_note}</div>
                    ) : null}
                  </td>
                  <td className="tabular-nums">
                    {job.application_count}
                    {job.max_applications ? <span className="text-slate-400"> / {job.max_applications}</span> : null}
                  </td>
                  <td className="tabular-nums">
                    {job.hired_count} / {job.hiring_quota}
                  </td>
                  <td>{formatCtc(job.ctc_lpa)}</td>
                  <td>{formatDate(job.application_deadline)}</td>
                  <td className="text-right">
                    <Link href={`/recruiter/jobs/${job.job_id}`} className="btn-secondary btn-sm">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
