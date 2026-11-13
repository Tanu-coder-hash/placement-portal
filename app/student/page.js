import Link from 'next/link';
import JobCard from '@/components/JobCard';
import Icon from '@/components/Icon';
import { Card, EmptyState, MatchDial, Stat, StatusBadge } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { formatCtc, formatDate, formatDateTime } from '@/lib/format';
import { many } from '@/lib/db';
import { getStudentProfile } from '@/lib/services/students';
import { studentApplicationSummary } from '@/lib/services/applications';
import { matchJobsForStudent } from '@/lib/services/matching';
import { listUpcomingInterviewsForStudent } from '@/lib/services/interviews';

export const dynamic = 'force-dynamic';

export default async function StudentDashboard() {
  const user = await requireUser('STUDENT');
  const [profile, summary, topJobs, interviews, projectCount, pendingOffers] = await Promise.all([
    getStudentProfile(user.user_id),
    studentApplicationSummary(user.user_id),
    matchJobsForStudent(user.user_id, { limit: 5 }),
    listUpcomingInterviewsForStudent(user.user_id),
    many('SELECT count(*) AS n FROM student_projects WHERE student_id = $1', [user.user_id]),
    many(
      `SELECT o.offer_id, o.ctc_lpa, o.respond_by, j.title, r.company_name
         FROM offers o JOIN applications a ON a.application_id = o.application_id
         JOIN job_postings j ON j.job_id = a.job_id JOIN recruiters r ON r.recruiter_id = j.recruiter_id
        WHERE a.student_id = $1 AND o.status = 'PENDING' ORDER BY o.respond_by`,
      [user.user_id],
    ),
  ]);

  const checklist = [
    ['Add a headline and skills', Boolean(profile.headline && profile.skills.length)],
    ['Upload your resume', Boolean(profile.resume_text)],
    ['Describe at least one project', projectCount[0].n > 0],
    ['AI profile indexed for matching', Boolean(profile.embedding_updated_at)],
  ];
  const done = checklist.filter(([, ok]) => ok).length;

  return (
    <div className="space-y-6">
      {/* Welcome band */}
      <section className="relative overflow-hidden rounded-[22px] bg-ink-900 p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[40px] border-marigold-400/10" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-ink-200">Placement season {profile.graduation_year}</p>
            <h1 className="mt-1 text-[32px] font-bold leading-tight text-white">Hi, {profile.full_name.split(' ')[0]}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-200">
              <span className="inline-flex items-center gap-1.5"><Icon name="graduation" size={15} />{profile.department_name}</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="award" size={15} />CGPA {profile.cgpa ?? '—'}</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="shield" size={15} />{profile.placement_status === 'PLACED' ? 'Placed' : 'Open to offers'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="rounded-full bg-white p-1">
              <MatchDial score={done / checklist.length} size={60} label={`${done} of ${checklist.length} profile steps done`} />
            </div>
            <div className="text-sm">
              <div className="font-semibold text-white">Profile strength</div>
              <div className="text-ink-200">{done} of {checklist.length} steps done</div>
              <Link href={done < checklist.length ? '/student/profile' : '/student/jobs'} className="mt-1.5 inline-flex items-center gap-1 font-semibold text-marigold-300 hover:text-marigold-200">
                {done < checklist.length ? 'Finish your profile' : 'See matched jobs'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Applications" value={summary.total} hint={`${summary.in_progress} in progress`} icon="clipboard" />
        <Stat label="Upcoming interviews" value={summary.upcoming_interviews} icon="calendar" />
        <Stat label="Offers awaiting reply" value={pendingOffers.length} icon="mail" tone={pendingOffers.length ? 'marigold' : 'default'} />
        <Stat label="Placement status" value={<StatusBadge status={profile.placement_status} />} icon="award" />
      </div>

      {pendingOffers.length ? (
        <Card icon="mail" title="Offers waiting for your decision" description="Accepting one offer automatically closes your other applications." className="border-marigold-200">
          <ul className="divide-y divide-line">
            {pendingOffers.map((o) => (
              <li key={o.offer_id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium">{o.title}</span> at {o.company_name} — {formatCtc(o.ctc_lpa)}
                </span>
                <Link href="/student/applications" className="btn-secondary btn-sm">
                  Respond by {formatDate(o.respond_by)}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Top matches for your profile</h2>
            <Link href="/student/jobs" className="text-sm font-medium text-brand-700 hover:underline">
              See all
            </Link>
          </div>
          {topJobs.length === 0 ? (
            <EmptyState title="No open jobs right now" description="New postings appear here once the placement office approves them." />
          ) : (
            topJobs.map((job, i) => (
              <JobCard key={job.job_id} job={job} rank={job.match_score !== null ? i + 1 : null} studentSkills={profile.skills} />
            ))
          )}
        </div>

        <div className="space-y-6">
          <Card icon="check" title="Profile checklist" description="Each step improves your matches">
            <ul className="space-y-2 text-sm">
              {checklist.map(([label, ok]) => (
                <li key={label} className="flex items-center gap-2.5">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full ${
                      ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Icon name={ok ? 'check' : 'plus'} size={13} strokeWidth={2.4} />
                  </span>
                  <span className={ok ? 'text-slate-700' : 'text-slate-500'}>{label}</span>
                </li>
              ))}
            </ul>
            {done < checklist.length ? (
              <Link href="/student/profile" className="btn-secondary btn-sm mt-4">
                Complete profile
              </Link>
            ) : null}
          </Card>

          <Card icon="calendar" title="Upcoming interviews">
            {interviews.length === 0 ? (
              <p className="text-sm text-slate-500">No interviews scheduled.</p>
            ) : (
              <ul className="space-y-3">
                {interviews.map((i) => (
                  <li key={i.interview_id} className="text-sm">
                    <div className="font-medium text-slate-900">
                      {i.company_name} — {i.round_name}
                    </div>
                    <div className="text-slate-500">
                      {formatDateTime(i.scheduled_at)} · {i.duration_minutes} min · {i.mode.toLowerCase()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
