import Link from 'next/link';
import ActionButton from '@/components/ActionButton';
import Timeline from '@/components/Timeline';
import Icon from '@/components/Icon';
import { Avatar, Badge, EmptyState, MatchScore, Meta, PageHeader, StatusBadge } from '@/components/ui';
import { acceptOfferAction, declineOfferAction, withdrawApplicationAction } from '@/app/actions/student';
import { requireUser } from '@/lib/auth';
import { JOB_TYPE_LABELS, formatCtc, formatDate, formatDateTime, statusLabel } from '@/lib/format';
import { listStudentApplications } from '@/lib/services/applications';

export const dynamic = 'force-dynamic';

const SEAL = {
  PENDING: { text: 'Awaiting your reply', ring: 'border-marigold-400 text-marigold-700' },
  ACCEPTED: { text: 'Accepted', ring: 'border-emerald-600 text-emerald-700' },
  DECLINED: { text: 'Declined', ring: 'border-slate-400 text-slate-500' },
  EXPIRED: { text: 'Expired', ring: 'border-slate-400 text-slate-500' },
  REVOKED: { text: 'Withdrawn by company', ring: 'border-red-500 text-red-600' },
};

/** The offer, presented as the letter it represents. */
function OfferLetter({ app }) {
  if (!app.offer_id) return null;
  const pending = app.offer_status === 'PENDING';
  const seal = SEAL[app.offer_status] || SEAL.PENDING;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_40px_-24px_rgba(20,30,77,0.45)]">
      <div className="h-1.5 bg-marigold-400" />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={app.company_name} square />
            <div>
              <div className="text-sm font-semibold text-ink-900">{app.company_name}</div>
              <div className="text-xs text-muted">Issued {formatDate(app.offer_issued_at)}</div>
            </div>
          </div>
          <div
            className={`grid h-[84px] w-[84px] shrink-0 -rotate-12 place-items-center rounded-full border-[3px] border-double p-2 text-center font-display text-[11px] font-bold leading-tight ${seal.ring}`}
          >
            {seal.text}
          </div>
        </div>

        <h3 className="mt-4 font-display text-2xl font-bold">Offer of employment</h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          {app.company_name} is pleased to offer you the role of <span className="font-semibold text-ink-900">{app.title}</span>{' '}
          with an annual package of <span className="font-semibold text-ink-900">{formatCtc(app.offer_ctc_lpa)}</span>.
        </p>
        {app.offer_notes ? <p className="mt-2 text-sm italic text-slate-500">“{app.offer_notes}”</p> : null}

        <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-dashed border-line pt-4">
          <div>
            <dt className="field-label">Package</dt>
            <dd className="font-display text-lg font-bold text-ink-900">{formatCtc(app.offer_ctc_lpa)}</dd>
          </div>
          <div>
            <dt className="field-label">Joining</dt>
            <dd className="text-sm font-semibold text-ink-900">{formatDate(app.joining_date)}</dd>
          </div>
          <div>
            <dt className="field-label">Reply by</dt>
            <dd className="text-sm font-semibold text-ink-900">{formatDate(app.respond_by)}</dd>
          </div>
        </dl>

        {pending ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-marigold-50 p-3">
            <ActionButton
              action={acceptOfferAction}
              args={[app.offer_id]}
              className="btn-accent"
              confirm="Accept this offer? This is final: all your other applications will be closed and other offers declined."
              pendingLabel="Accepting…"
            >
              <Icon name="check" size={16} strokeWidth={2.4} />
              Accept offer
            </ActionButton>
            <ActionButton
              action={declineOfferAction}
              args={[app.offer_id]}
              className="btn-ghost"
              confirm="Decline this offer?"
              pendingLabel="Declining…"
            >
              Decline
            </ActionButton>
            <span className="text-xs text-marigold-800">Accepting closes your other applications in one step.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default async function StudentApplicationsPage() {
  const user = await requireUser('STUDENT');
  const applications = await listStudentApplications(user.user_id);

  return (
    <div className="space-y-6">
      <PageHeader icon="clipboard" title="My applications" subtitle="Every status change is recorded by a database trigger, so each step below is a real milestone." />

      {applications.length === 0 ? (
        <EmptyState
          title="You have not applied anywhere yet"
          description="Your AI-matched openings are waiting."
          action={
            <Link href="/student/jobs" className="btn-primary">
              Find jobs
            </Link>
          }
        />
      ) : (
        applications.map((app) => (
          <section key={app.application_id} className="card overflow-hidden">
            <header className="flex flex-col gap-4 border-b border-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar name={app.company_name} square size="lg" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/student/jobs/${app.job_id}`} className="font-display text-xl font-bold text-ink-900 hover:text-ink-700">
                      {app.title}
                    </Link>
                    <Badge tone="indigo">{JOB_TYPE_LABELS[app.job_type]}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <Meta icon="building">{app.company_name}</Meta>
                    {app.location ? <Meta icon="pin">{app.location}</Meta> : null}
                    <Meta icon="money">{formatCtc(app.ctc_lpa)}</Meta>
                    <Meta icon="clock">Applied {formatDate(app.applied_at)}</Meta>
                  </div>
                </div>
              </div>
              <StatusBadge status={app.status} />
            </header>

            <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div>
                <h3 className="mb-3 text-sm font-semibold">Milestones</h3>
                <Timeline history={app.history} />
              </div>

              <div className="space-y-5">
                <OfferLetter app={app} />

                <div>
                  <h3 className="mb-3 text-sm font-semibold">Interview rounds</h3>
                  {app.interviews.length === 0 ? (
                    <p className="text-sm text-muted">No interviews scheduled yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {app.interviews.map((i) => (
                        <li key={i.interview_id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line px-4 py-3">
                          <div className="flex gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-50 font-display text-sm font-bold text-ink-700">
                              {i.round_number}
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-ink-900">{i.round_name}</div>
                              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                <Meta icon="calendar" className="text-xs">{formatDateTime(i.scheduled_at)}</Meta>
                                <Meta icon="clock" className="text-xs">{i.duration_minutes} min, {i.mode.toLowerCase()}</Meta>
                              </div>
                              {i.location_or_link ? <div className="mt-1 text-xs text-ink-700">{i.location_or_link}</div> : null}
                              {i.feedback ? <div className="mt-1.5 text-xs text-slate-600">Feedback: {i.feedback}</div> : null}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <StatusBadge status={i.status} />
                            {i.status === 'COMPLETED' ? <StatusBadge status={i.result} /> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3">
                  <div className="flex items-center gap-3 text-sm text-muted">
                    <MatchScore score={app.match_score} compact />
                    Your semantic fit when you applied
                  </div>
                  {['APPLIED', 'SHORTLISTED', 'INTERVIEWING'].includes(app.status) ? (
                    <ActionButton
                      action={withdrawApplicationAction}
                      args={[app.application_id]}
                      className="btn-ghost btn-sm text-red-700"
                      confirm={`Withdraw your application (currently ${statusLabel(app.status).toLowerCase()})?`}
                    >
                      Withdraw application
                    </ActionButton>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
