import Link from 'next/link';
import ActionButton from '@/components/ActionButton';
import { InterviewOutcomeForm } from '@/components/RecruiterForms';
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { cancelInterviewAction } from '@/app/actions/recruiter';
import { requireUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { listInterviewsForRecruiter } from '@/lib/services/interviews';

export const dynamic = 'force-dynamic';

export default async function RecruiterInterviewsPage() {
  const user = await requireUser('RECRUITER');
  const interviews = await listInterviewsForRecruiter(user.user_id);
  const canManage = user.verification_status === 'VERIFIED';

  return (
    <div className="space-y-5">
      <PageHeader title="Interviews" subtitle="All rounds across your postings. Upcoming rounds are listed first." />
      {interviews.length === 0 ? (
        <EmptyState title="No interviews yet" description="Schedule rounds from a job's applicant list." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Candidate</th>
                <th>Job · round</th>
                <th>Status</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interviews.map((i) => (
                <tr key={i.interview_id}>
                  <td className="whitespace-nowrap">
                    {formatDateTime(i.scheduled_at)}
                    <div className="text-xs text-slate-500">
                      {i.duration_minutes} min · {i.mode.toLowerCase()}
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-slate-900">{i.student_name}</div>
                    <div className="text-xs text-slate-500">
                      {i.roll_number} · {i.department_code}
                    </div>
                  </td>
                  <td>
                    <Link href={`/recruiter/jobs/${i.job_id}?tab=interviews`} className="font-medium text-brand-700 hover:underline">
                      {i.job_title}
                    </Link>
                    <div className="text-xs text-slate-500">
                      Round {i.round_number}: {i.round_name}
                      {i.location_or_link ? ` · ${i.location_or_link}` : ''}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="min-w-[16rem]">
                    {i.status === 'SCHEDULED' && canManage ? (
                      <div className="space-y-2">
                        <details>
                          <summary className="cursor-pointer text-sm font-medium text-brand-700">Record outcome</summary>
                          <div className="mt-2">
                            <InterviewOutcomeForm interviewId={i.interview_id} />
                          </div>
                        </details>
                        <ActionButton
                          action={cancelInterviewAction}
                          args={[i.interview_id]}
                          className="btn-ghost btn-sm text-red-600"
                          confirm="Cancel this interview?"
                        >
                          Cancel
                        </ActionButton>
                      </div>
                    ) : i.status === 'COMPLETED' ? (
                      <div>
                        <StatusBadge status={i.result} />
                        {i.feedback ? <p className="mt-1 text-xs text-slate-600">{i.feedback}</p> : null}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
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
