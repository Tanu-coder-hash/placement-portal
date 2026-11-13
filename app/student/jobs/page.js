import Link from 'next/link';
import JobCard from '@/components/JobCard';
import { Alert, EmptyState, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { matchJobsForStudent } from '@/lib/services/matching';

export const dynamic = 'force-dynamic';

export default async function StudentJobsPage({ searchParams }) {
  const user = await requireUser('STUDENT');
  const params = (await searchParams) || {};
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 300) : '';

  const student = await one(
    `SELECT s.skills, (se.student_id IS NOT NULL) AS indexed
       FROM students s LEFT JOIN student_embeddings se ON se.student_id = s.student_id
      WHERE s.student_id = $1`,
    [user.user_id],
  );

  let jobs = [];
  let searchError = null;
  try {
    jobs = await matchJobsForStudent(user.user_id, { searchText: q || null, limit: 60 });
  } catch (err) {
    console.error('[student jobs] semantic search failed', err);
    searchError = 'Semantic search is unavailable right now (the embedding model could not be loaded). Showing jobs ranked by your profile instead.';
    jobs = await matchJobsForStudent(user.user_id, { limit: 60 });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Matched jobs"
        subtitle={
          q
            ? `Open jobs ranked by semantic similarity to “${q}”.`
            : 'Open jobs ranked by cosine similarity between your profile embedding and each job description.'
        }
      />

      <form method="get" className="card flex flex-col gap-2 p-3 sm:flex-row">
        <input
          name="q"
          defaultValue={q}
          className="input flex-1"
          placeholder='Describe the role you want, e.g. "building data pipelines and dashboards with Python"'
          aria-label="Semantic job search"
        />
        <button className="btn-primary" type="submit">
          Semantic search
        </button>
        {q ? (
          <Link href="/student/jobs" className="btn-secondary">
            Clear
          </Link>
        ) : null}
      </form>

      {searchError ? <Alert tone="amber">{searchError}</Alert> : null}
      {!q && !student.indexed ? (
        <Alert tone="blue" title="Your AI profile is not indexed yet">
          Add your skills, projects or resume on the{' '}
          <Link href="/student/profile" className="font-medium underline">
            profile page
          </Link>{' '}
          so jobs can be ranked for you. Until then jobs are listed newest first.
        </Alert>
      ) : null}

      {jobs.length === 0 ? (
        <EmptyState title="No open jobs" description="There are no open postings right now. Check back soon." />
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <JobCard key={job.job_id} job={job} rank={job.match_score !== null ? i + 1 : null} studentSkills={student.skills} />
          ))}
        </div>
      )}
    </div>
  );
}
