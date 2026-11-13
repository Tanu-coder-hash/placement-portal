import Link from 'next/link';
import { notFound } from 'next/navigation';
import ActionButton from '@/components/ActionButton';
import BarChart from '@/components/BarChart';
import Icon from '@/components/Icon';
import { InterviewOutcomeForm, OfferForm, ScheduleInterviewForm } from '@/components/RecruiterForms';
import {
  Alert,
  Avatar,
  Badge,
  Card,
  DefinitionList,
  EmptyState,
  MatchScore,
  Meta,
  PageHeader,
  SkillChips,
  SkillMatch,
  StatusBadge,
} from '@/components/ui';
import {
  cancelInterviewAction,
  closeJobAction,
  reindexJobAction,
  rejectApplicationAction,
  shortlistAction,
} from '@/app/actions/recruiter';
import { requireUser } from '@/lib/auth';
import {
  CLOSED_REASON_LABELS,
  JOB_TYPE_LABELS,
  formatCtc,
  formatDate,
  formatDateTime,
  formatPercent,
  statusLabel,
} from '@/lib/format';
import { getJob } from '@/lib/services/jobs';
import { discoverCandidatesForJob, rankApplicantsForJob } from '@/lib/services/matching';
import { listInterviewsForJob } from '@/lib/services/interviews';
import { getJobFunnel } from '@/lib/services/stats';

export const dynamic = 'force-dynamic';

const TABS = [
  ['applicants', 'AI-ranked applicants'],
  ['discover', 'Suggested candidates'],
  ['interviews', 'Interviews'],
  ['details', 'Posting details'],
];

function ApplicantCard({ applicant, rank, job, canManage }) {
  const a = applicant;
  const live = ['APPLIED', 'SHORTLISTED', 'INTERVIEWING'].includes(a.status);
  const placedElsewhere = a.placement_status === 'PLACED' && a.status !== 'ACCEPTED';

  return (
    <div className="card p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="relative">
            <Avatar name={a.full_name} size="lg" />
            <span className="absolute -left-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-ink-900 px-1.5 text-[11px] font-bold text-white ring-2 ring-white">
              {rank}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-lg font-bold text-ink-900">{a.full_name}</span>
              <StatusBadge status={a.status} />
              {placedElsewhere ? <Badge tone="slate">Placed elsewhere</Badge> : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <Meta icon="graduation">
                {a.department_code}, {a.graduation_year}
              </Meta>
              <Meta icon="award">CGPA {a.cgpa ?? '—'}</Meta>
              <Meta icon="file">{a.roll_number}</Meta>
              <Meta icon="clock">Applied {formatDate(a.applied_at)}</Meta>
            </div>
            {a.headline ? <p className="mt-2 text-sm text-slate-600">{a.headline}</p> : null}
          </div>
        </div>
        <MatchScore score={a.match_score} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-semibold">Skill overlap</div>
          {job.required_skills.length ? (
            <SkillMatch candidateSkills={a.skills} requiredSkills={job.required_skills} />
          ) : (
            <SkillChips skills={a.skills} />
          )}
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">Best-matching project</div>
          {a.best_project_title ? (
            <p className="flex items-center gap-2 text-sm text-slate-700">
              <Icon name="folder" size={16} className="text-ink-500" />
              <span>
                {a.best_project_title}{' '}
                <span className="text-xs text-muted">{formatPercent(a.best_project_score)} similar</span>
              </span>
            </p>
          ) : (
            <p className="text-sm text-slate-400">No indexed projects</p>
          )}
        </div>
      </div>

      {a.cover_note ? (
        <blockquote className="mt-4 border-l-2 border-slate-200 pl-3 text-sm italic text-slate-600">{a.cover_note}</blockquote>
      ) : null}

      {a.offer_id ? (
        <div className="mt-4 flex items-center gap-2 text-sm">
          Offer {formatCtc(a.offer_ctc_lpa)} · respond by {formatDate(a.respond_by)} <StatusBadge status={a.offer_status} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        {a.has_resume ? (
          <a href={`/api/resume/${a.student_id}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
            Resume
          </a>
        ) : null}
        <a href={`mailto:${a.email}`} className="btn-ghost btn-sm">
          Email
        </a>
        {canManage && a.status === 'APPLIED' ? (
          <ActionButton action={shortlistAction} args={[a.application_id]} className="btn-secondary btn-sm">
            Shortlist
          </ActionButton>
        ) : null}
        {canManage && (live || a.status === 'OFFERED') ? (
          <ActionButton
            action={rejectApplicationAction}
            args={[a.application_id]}
            className="btn-ghost btn-sm text-red-600"
            confirm={`Reject ${a.full_name}? ${a.status === 'OFFERED' ? 'The pending offer will be revoked.' : ''}`}
          >
            Reject
          </ActionButton>
        ) : null}
      </div>

      {canManage && live && !placedElsewhere ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <details className="rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Schedule {a.rounds_scheduled ? `round ${a.rounds_scheduled + 1}` : 'interview'}
            </summary>
            <div className="mt-3">
              <ScheduleInterviewForm applicationId={a.application_id} nextRound={a.rounds_scheduled + 1} />
            </div>
          </details>
          <details className="rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">Make an offer</summary>
            <div className="mt-3">
              <OfferForm applicationId={a.application_id} defaultCtc={job.ctc_lpa} />
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}

export default async function RecruiterJobPage({ params, searchParams }) {
  const user = await requireUser('RECRUITER');
  const { jobId } = await params;
  const sp = (await searchParams) || {};
  const tab = TABS.some(([key]) => key === sp.tab) ? sp.tab : 'applicants';

  const jid = Number(jobId);
  if (!Number.isInteger(jid)) notFound();
  const job = await getJob(jid);
  if (!job || job.recruiter_id !== user.user_id) notFound();

  const canManage = user.verification_status === 'VERIFIED';
  const funnel = await getJobFunnel(jid);

  let content = null;
  if (tab === 'applicants') {
    const applicants = await rankApplicantsForJob(jid);
    content =
      applicants.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description={job.status === 'OPEN' ? 'Check “Suggested candidates” for students whose profiles fit this role.' : undefined}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Ranked by <code>1 − (student_embedding &lt;=&gt; job_embedding)</code>, the cosine similarity computed by
            pgvector.
          </p>
          {applicants.map((a, i) => (
            <ApplicantCard key={a.application_id} applicant={a} rank={i + 1} job={job} canManage={canManage} />
          ))}
        </div>
      );
  } else if (tab === 'discover') {
    const candidates = job.indexed ? await discoverCandidatesForJob(jid, 15) : [];
    content = !job.indexed ? (
      <Alert tone="amber">This job has no embedding yet — use “Re-index for AI” above.</Alert>
    ) : candidates.length === 0 ? (
      <EmptyState title="No suggestions" description="Every eligible, indexed student has already applied or is placed." />
    ) : (
      <Card
        title="Eligible students who have not applied"
        description="Nearest neighbours of this job's vector in student_embeddings (HNSW index). Shared with you for outreach through the placement office."
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-slate-100">
          {candidates.map((c) => (
            <li key={c.student_id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-medium text-slate-900">{c.full_name}</div>
                <div className="text-xs text-slate-500">
                  {c.roll_number} · {c.department_code} · CGPA {c.cgpa}
                </div>
                <div className="mt-2">
                  <SkillMatch candidateSkills={c.skills} requiredSkills={job.required_skills} max={8} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <MatchScore score={c.match_score} />
                {c.has_resume ? (
                  <a href={`/api/resume/${c.student_id}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                    Resume
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    );
  } else if (tab === 'interviews') {
    const interviews = await listInterviewsForJob(jid);
    content =
      interviews.length === 0 ? (
        <EmptyState title="No interviews scheduled" description="Schedule rounds from the applicant list." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Round</th>
                <th>When</th>
                <th>Status</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interviews.map((i) => (
                <tr key={i.interview_id}>
                  <td className="font-medium text-slate-900">{i.full_name}</td>
                  <td>
                    {i.round_number}. {i.round_name}
                    <div className="text-xs text-slate-500">
                      {i.mode.toLowerCase()}
                      {i.location_or_link ? ` · ${i.location_or_link}` : ''}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    {formatDateTime(i.scheduled_at)}
                    <div className="text-xs text-slate-500">{i.duration_minutes} min</div>
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
      );
  } else {
    content = (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Description">
          <p className="whitespace-pre-line text-sm text-slate-700">{job.description}</p>
        </Card>
        <Card title="Requirements">
          <p className="whitespace-pre-line text-sm text-slate-700">{job.requirements}</p>
          <div className="mt-4">
            <SkillChips skills={job.required_skills} max={30} />
          </div>
        </Card>
      </div>
    );
  }

  const funnelData = funnel
    .filter((f) => f.status !== 'WITHDRAWN' || f.total > 0)
    .map((f) => ({ label: statusLabel(f.status), value: f.total, detail: `${f.total} application(s)` }));

  return (
    <div className="space-y-6">
      <Link href="/recruiter" className="text-sm text-brand-700 hover:underline">
        ← All postings
      </Link>
      <PageHeader
        title={job.title}
        subtitle={`${JOB_TYPE_LABELS[job.job_type]} · ${job.location || 'Location not set'} · ${formatCtc(job.ctc_lpa)}`}
        actions={
          <>
            <StatusBadge status={job.status} />
            {canManage && !job.indexed ? (
              <ActionButton action={reindexJobAction} args={[job.job_id]} className="btn-secondary btn-sm">
                Re-index for AI
              </ActionButton>
            ) : null}
            {canManage && job.status === 'OPEN' ? (
              <ActionButton
                action={closeJobAction}
                args={[job.job_id]}
                className="btn-secondary btn-sm"
                confirm="Close this job to new applications? Existing candidates stay in your pipeline."
              >
                Close job
              </ActionButton>
            ) : null}
          </>
        }
      />

      {job.status === 'PENDING_APPROVAL' ? (
        <Alert tone="amber" title="Waiting for placement office approval">
          Students will see this posting once it is approved.
        </Alert>
      ) : null}
      {job.status === 'REJECTED' ? (
        <Alert tone="red" title="Posting rejected by the placement office">
          {job.review_note}
        </Alert>
      ) : null}
      {job.status === 'CLOSED' && job.closed_reason ? (
        <Alert tone="blue" title={`Closed: ${CLOSED_REASON_LABELS[job.closed_reason]}`}>
          {job.closed_reason === 'HIRING_QUOTA_FILLED'
            ? 'A trigger closed this posting when accepted offers reached the hiring quota and auto-rejected the remaining in-progress applications.'
            : job.closed_reason === 'APPLICATION_LIMIT_REACHED'
              ? 'A trigger closed this posting when the maximum number of applications was reached.'
              : 'No new applications are accepted.'}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card icon="chart" title="Hiring funnel" description="Applications per stage, from the stored function fn_job_funnel" className="lg:col-span-2">
          <BarChart data={funnelData} labelWidth="6.5rem" emptyText="No applications yet." />
        </Card>
        <Card icon="briefcase" title="At a glance">
          <DefinitionList
            items={[
              ['Applications', job.max_applications ? `${job.application_count} / ${job.max_applications}` : job.application_count],
              ['Hired', `${job.hired_count} / ${job.hiring_quota}`],
              ['Min CGPA', job.min_cgpa],
              ['Deadline', formatDate(job.application_deadline)],
              ['Departments', job.eligible_departments.length ? job.eligible_departments.join(', ') : 'All'],
              ['AI index', job.indexed ? 'Indexed' : 'Missing'],
            ]}
          />
        </Card>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-canvas p-1">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/recruiter/jobs/${job.job_id}?tab=${key}`}
            className={`whitespace-nowrap rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors ${
              tab === key ? 'bg-ink-900 text-white' : 'text-slate-600 hover:bg-white hover:text-ink-900'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {content}
    </div>
  );
}
