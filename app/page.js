import Link from 'next/link';
import Icon from '@/components/Icon';
import Logo from '@/components/Logo';
import { Avatar, MatchDial } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { dashboardPathFor } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const SEASON = [
  {
    title: 'Students describe what they can do',
    body: 'A resume, a few projects and a skill list become one 384-number vector that captures meaning, not keywords.',
    icon: 'file',
  },
  {
    title: 'Recruiters post a role',
    body: 'The placement office approves it, and the job description is embedded the same way.',
    icon: 'briefcase',
  },
  {
    title: 'Candidates are ranked by fit',
    body: 'Cosine similarity in pgvector orders applicants and explains the match with their closest project.',
    icon: 'target',
  },
  {
    title: 'One accepted offer settles everything',
    body: 'A single transaction places the student, closes their other applications and declines competing offers.',
    icon: 'award',
  },
];

const DEMO_CANDIDATES = [
  { name: 'Aarav Sharma', detail: 'Campus Food Ordering Platform', score: 0.83 },
  { name: 'Rohan Gupta', detail: 'Hostel Complaint Tracker', score: 0.64 },
  { name: 'Meera Nair', detail: 'Kubernetes Cluster Monitor', score: 0.53 },
];

async function liveNumbers() {
  try {
    return await one(
      `SELECT (SELECT count(*) FROM job_postings WHERE status = 'OPEN') AS open_jobs,
              s.total_students, s.placed_students, s.highest_ctc
         FROM fn_overall_placement_summary(NULL) s`,
    );
  } catch {
    return null; // database not set up yet — the page still renders
  }
}

export default async function HomePage() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  const live = await liveNumbers();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-ink-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full border-[56px] border-marigold-400/10"
        />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Logo onDark />
          <div className="flex items-center gap-2">
            {user ? (
              <Link href={dashboardPathFor(user.role)} className="btn-accent">
                Open my dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn text-ink-100 hover:bg-white/10">
                  Sign in
                </Link>
                <Link href="/register" className="btn-accent">
                  Create account
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-16">
          <div>
            <h1 className="font-display text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] text-white sm:text-[60px]">
              Read every resume for what it means.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-200">
              The campus placement portal that matches students to job descriptions by meaning, and keeps every
              application, interview and offer consistent in PostgreSQL.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={user ? dashboardPathFor(user.role) : '/register'} className="btn-accent px-5 py-3 text-base">
                {user ? 'Continue to dashboard' : 'Join this placement season'}
              </Link>
              {!user ? (
                <Link href="/login" className="btn border border-white/20 px-5 py-3 text-base text-white hover:bg-white/10">
                  I already have an account
                </Link>
              ) : null}
            </div>
          </div>

          {/* The characteristic moment: a job description and the candidates it pulls in. */}
          <div className="relative">
            <div className="rounded-[22px] bg-white p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]">
              <div className="flex items-start gap-3">
                <Avatar name="NovaByte Technologies" square />
                <div>
                  <div className="font-display text-lg font-bold text-ink-900">Backend Software Engineer</div>
                  <div className="text-sm text-muted">NovaByte Technologies, Bengaluru</div>
                </div>
              </div>
              <p className="mt-4 rounded-xl bg-canvas px-4 py-3 text-sm leading-relaxed text-slate-600">
                Design and build backend services, write SQL against a relational database, package services with
                containers and keep them reliable in production.
              </p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-900">Ranked by semantic fit</span>
                <span className="text-xs text-muted">no keyword filters</span>
              </div>
              <ul className="mt-3 space-y-2.5">
                {DEMO_CANDIDATES.map((c) => (
                  <li key={c.name} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                    <Avatar name={c.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink-900">{c.name}</div>
                      <div className="truncate text-xs text-muted">Closest project: {c.detail}</div>
                    </div>
                    <MatchDial score={c.score} size={44} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Live numbers straight from the database */}
      {live ? (
        <div className="border-b border-line bg-canvas">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4">
            {[
              ['Open roles right now', live.open_jobs],
              ['Students in the pool', live.total_students],
              ['Placed this season', live.placed_students],
              ['Highest package', live.highest_ctc ? `₹${live.highest_ctc} LPA` : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dd className="font-display text-3xl font-bold text-ink-900">{value}</dd>
                <dt className="mt-1 text-sm text-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {/* The season, in order */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="max-w-xl font-display text-3xl font-bold leading-tight sm:text-4xl">How a placement season runs here</h2>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {SEASON.map((step, i) => (
            <li key={step.title} className="bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ink-50 text-ink-700">
                  <Icon name={step.icon} size={20} />
                </span>
                <span className="font-display text-sm font-bold text-slate-400">Step {i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold leading-snug">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Roles */}
      <section className="border-t border-line bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3">
          {[
            ['graduation', 'Students', 'Upload a resume, see the roles that fit you best, apply and follow every round until the offer.'],
            ['building', 'Recruiters', 'Post a role and get applicants ranked by fit, with interviews and offers managed in one place.'],
            ['shield', 'Placement office', 'Verify students and companies, approve postings and watch department-wise results live.'],
          ].map(([icon, title, body]) => (
            <div key={title} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-ink-700 ring-1 ring-line">
                <Icon name={icon} size={20} />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted">
        <span>PlacementPortal, a DBMS project</span>
        <span>PostgreSQL 16 with pgvector, Next.js, all-MiniLM-L6-v2</span>
      </footer>
    </div>
  );
}
