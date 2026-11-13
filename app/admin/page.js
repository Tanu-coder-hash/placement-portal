import Link from 'next/link';
import ActionButton from '@/components/ActionButton';
import Icon from '@/components/Icon';
import BarChart from '@/components/BarChart';
import { Card, PageHeader, Stat } from '@/components/ui';
import { rebuildEmbeddingsAction, refreshStatsAction, runMaintenanceAction } from '@/app/actions/admin';
import { requireUser } from '@/lib/auth';
import { formatCtc, formatDateTime, statusLabel } from '@/lib/format';
import {
  getCompanyStats,
  getDepartmentStats,
  getGraduationYears,
  getOverallSummary,
  getRecentActivity,
} from '@/lib/services/stats';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({ searchParams }) {
  await requireUser('ADMIN');
  const sp = (await searchParams) || {};
  const years = await getGraduationYears();
  const year = years.includes(Number(sp.year)) ? Number(sp.year) : null;

  const [summary, departments, companies, activity] = await Promise.all([
    getOverallSummary(year),
    getDepartmentStats(year),
    getCompanyStats(year),
    getRecentActivity(12),
  ]);
  const computedAt = departments[0]?.computed_at;
  const withStudents = departments.filter((d) => d.total_students > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon="chart"
        title="Placement statistics"
        subtitle={`${year ? `Batch of ${year}` : 'All batches'} · department figures from sp_refresh_placement_stats${
          computedAt ? `, computed ${formatDateTime(computedAt)}` : ''
        }`}
        actions={
          <>
            <ActionButton action={refreshStatsAction} args={[year]} className="btn-primary btn-sm" pendingLabel="Recomputing…">
              Recompute statistics
            </ActionButton>
            <ActionButton action={runMaintenanceAction} className="btn-secondary btn-sm" pendingLabel="Running…">
              Run maintenance
            </ActionButton>
          </>
        }
      />

      <form method="get" className="flex flex-wrap items-center gap-2">
        <label htmlFor="year" className="text-sm font-medium text-slate-700">
          Batch
        </label>
        <select id="year" name="year" defaultValue={year || ''} className="input w-auto">
          <option value="">All batches</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary btn-sm">
          Apply
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          tone="ink"
          icon="award"
          label="Placement rate"
          value={summary.placement_percentage === null ? '—' : `${summary.placement_percentage}%`}
          hint={`${summary.placed_students} of ${summary.total_students} verified students`}
        />
        <Stat icon="money" label="Average CTC" value={formatCtc(summary.average_ctc)} hint={`Median ${formatCtc(summary.median_ctc)}`} />
        <Stat icon="chart" label="Highest CTC" value={formatCtc(summary.highest_ctc)} />
        <Stat
          icon="mail"
          label="Offers"
          value={summary.total_offers}
          hint={`${summary.pending_offers} awaiting reply · ${summary.total_applications} applications`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card icon="graduation" title="Placement rate by department" description="Placed students as a share of verified students">
          <BarChart
            data={withStudents.map((d) => ({
              label: d.department_code,
              fullLabel: d.department_name,
              value: d.placement_percentage ?? 0,
              detail: `${d.placed_students} of ${d.total_students} students placed`,
            }))}
            max={100}
            format={(v) => `${Number(v).toFixed(0)}%`}
            emptyText="No verified students yet."
          />
        </Card>
        <Card icon="money" title="Average package by department" description="Accepted offers, in ₹ lakh per year">
          <BarChart
            data={withStudents
              .filter((d) => d.average_ctc !== null)
              .map((d) => ({
                label: d.department_code,
                fullLabel: d.department_name,
                value: d.average_ctc,
                detail: `Median ${formatCtc(d.median_ctc)} · highest ${formatCtc(d.highest_ctc)}`,
              }))}
            format={(v) => `₹${Number(v).toFixed(1)}L`}
            emptyText="No accepted offers yet."
          />
        </Card>
      </div>

      <Card className="overflow-hidden" icon="table" title="Department-wise summary" description="Written by the stored procedure sp_refresh_placement_stats into placement_stats_snapshot" bodyClassName="mt-4 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Department</th>
              <th className="text-right">Students</th>
              <th className="text-right">Placed</th>
              <th className="text-right">Placement %</th>
              <th className="text-right">Offers</th>
              <th className="text-right">Average CTC</th>
              <th className="text-right">Median CTC</th>
              <th className="text-right">Highest CTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {departments.map((d) => (
              <tr key={d.department_id}>
                <td>
                  <span className="font-medium text-slate-900">{d.department_code}</span>{' '}
                  <span className="text-slate-500">{d.department_name}</span>
                </td>
                <td className="text-right tabular-nums">{d.total_students}</td>
                <td className="text-right tabular-nums">{d.placed_students}</td>
                <td className="text-right tabular-nums">{d.placement_percentage === null ? '—' : `${d.placement_percentage}%`}</td>
                <td className="text-right tabular-nums">{d.total_offers}</td>
                <td className="text-right tabular-nums">{formatCtc(d.average_ctc)}</td>
                <td className="text-right tabular-nums">{formatCtc(d.median_ctc)}</td>
                <td className="text-right tabular-nums">{formatCtc(d.highest_ctc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Card icon="building" title="Company-wise hiring" description="From the stored function fn_company_hiring_stats" className="overflow-hidden xl:col-span-3" bodyClassName="mt-4 overflow-x-auto">
          {companies.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No approved job postings yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th className="text-right">Jobs</th>
                  <th className="text-right">Applications</th>
                  <th className="text-right">Offers</th>
                  <th className="text-right">Hires</th>
                  <th className="text-right">Avg CTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <tr key={c.company_name}>
                    <td className="font-medium text-slate-900">{c.company_name}</td>
                    <td className="text-right tabular-nums">{c.jobs_posted}</td>
                    <td className="text-right tabular-nums">{c.applications}</td>
                    <td className="text-right tabular-nums">{c.offers_made}</td>
                    <td className="text-right tabular-nums">{c.hires}</td>
                    <td className="text-right tabular-nums">{formatCtc(c.average_ctc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card icon="clock" title="Recent milestones" description="Logged by a trigger into application_status_history" className="xl:col-span-2">
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.history_id} className="text-sm">
                  <div>
                    <span className="font-medium text-slate-900">{a.student_name}</span> →{' '}
                    <span className="font-medium">{statusLabel(a.new_status)}</span>{' '}
                    <span className="text-slate-500">
                      · {a.job_title}, {a.company_name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(a.changed_at)}
                    {a.note ? ` · ${a.note}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="relative overflow-hidden rounded-[22px] bg-ink-900 p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border-[36px] border-marigold-400/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-marigold-400 text-ink-950">
              <Icon name="database" size={22} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">See where your data lives</h2>
              <p className="mt-1 max-w-xl text-sm text-ink-200">
                Open the database explorer to find the folder PostgreSQL writes to, every table with its size and file on
                disk, the triggers and procedures, and live queries.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/database" className="btn-accent">
              Open database explorer
            </Link>
            <ActionButton
              action={rebuildEmbeddingsAction}
              className="btn border border-white/20 text-white hover:bg-white/10"
              pendingLabel="Rebuilding…"
              confirm="Re-embed all students, projects and jobs now? This can take a minute."
            >
              Rebuild AI index
            </ActionButton>
          </div>
        </div>
      </section>
    </div>
  );
}
