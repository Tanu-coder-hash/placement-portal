import { Alert, Card, EmptyState, MatchScore, PageHeader, SkillChips, StatusBadge } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { formatPercent } from '@/lib/format';
import { listDepartments } from '@/lib/services/accounts';
import { semanticTalentSearch } from '@/lib/services/matching';

export const dynamic = 'force-dynamic';

const EXAMPLES = [
  'backend developer who has built REST APIs with a relational database',
  'machine learning on images or computer vision',
  'embedded systems and microcontroller firmware',
  'data analyst comfortable with SQL and dashboards',
];

export default async function TalentSearchPage({ searchParams }) {
  const user = await requireUser('RECRUITER');
  const sp = (await searchParams) || {};
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 300) : '';
  const departmentId = Number(sp.department) || null;
  const minCgpa = sp.minCgpa ? Number(sp.minCgpa) : null;
  const includePlaced = sp.includePlaced === '1';
  const departments = await listDepartments();

  let results = [];
  let error = null;
  if (q && user.verification_status === 'VERIFIED') {
    try {
      results = await semanticTalentSearch(q, {
        departmentId,
        minCgpa: Number.isFinite(minCgpa) ? minCgpa : null,
        onlyUnplaced: !includePlaced,
      });
    } catch (err) {
      console.error('[talent search]', err);
      error = 'Semantic search is unavailable — the embedding model could not be loaded on the server.';
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI talent search"
        subtitle="Describe the person you need in plain language. The query is embedded and compared with every student profile vector."
      />

      {user.verification_status !== 'VERIFIED' ? (
        <Alert tone="amber">Talent search unlocks after your account is verified.</Alert>
      ) : (
        <form method="get" className="card grid gap-3 p-4 md:grid-cols-6">
          <div className="md:col-span-6">
            <label className="label" htmlFor="q">
              What are you looking for?
            </label>
            <input id="q" name="q" defaultValue={q} required className="input" placeholder={EXAMPLES[0]} />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="department">
              Department
            </label>
            <select id="department" name="department" defaultValue={departmentId || ''} className="input">
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="minCgpa">
              Minimum CGPA
            </label>
            <input id="minCgpa" name="minCgpa" type="number" step="0.1" min="0" max="10" defaultValue={sp.minCgpa || ''} className="input" />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm md:col-span-1">
            <input type="checkbox" name="includePlaced" value="1" defaultChecked={includePlaced} className="h-4 w-4" />
            Include placed
          </label>
          <div className="flex items-end md:col-span-1">
            <button type="submit" className="btn-primary w-full">
              Search
            </button>
          </div>
        </form>
      )}

      {error ? <Alert tone="red">{error}</Alert> : null}

      {!q ? (
        <Card title="Try a query">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {EXAMPLES.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Card>
      ) : results.length === 0 && !error && user.verification_status === 'VERIFIED' ? (
        <EmptyState title="No matching students" description="Try a broader description or remove filters." />
      ) : (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={r.student_id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{r.full_name}</span>
                    <StatusBadge status={r.placement_status} />
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.roll_number} · {r.department_code} · {r.graduation_year} · CGPA {r.cgpa}
                  </div>
                  {r.headline ? <p className="mt-1 text-sm text-slate-600">{r.headline}</p> : null}
                  <div className="mt-2">
                    <SkillChips skills={r.skills} max={10} />
                  </div>
                  {r.best_project_title ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Closest project: <span className="font-medium text-slate-700">{r.best_project_title}</span> (
                      {formatPercent(r.best_project_score)})
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <MatchScore score={r.match_score} />
                {r.has_resume ? (
                  <a href={`/api/resume/${r.student_id}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                    Resume
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
