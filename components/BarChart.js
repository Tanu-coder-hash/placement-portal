// Single-series horizontal bar chart (pure HTML/CSS, server-rendered).
// Thin bars (18px), 4px rounded data-end square at the baseline, value at the tip,
// hairline gridlines, per-bar hover tooltip. One series => no legend; the title names it.

export default function BarChart({
  title,
  subtitle,
  data,
  max,
  format = (v) => String(v),
  emptyText = 'No data yet.',
  labelWidth = '4.5rem',
}) {
  const values = data.map((d) => Number(d.value) || 0);
  const scaleMax = max ?? Math.max(...values, 0);

  return (
    <figure className="w-full">
      {title ? (
        <figcaption className="mb-3">
          <div className="text-sm font-semibold text-ink-900">{title}</div>
          {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
        </figcaption>
      ) : null}

      {data.length === 0 || scaleMax === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {data.map((d) => {
            const value = Number(d.value) || 0;
            const pct = scaleMax > 0 ? (value / scaleMax) * 100 : 0;
            const label = `${d.label}: ${format(d.value)}${d.detail ? ` — ${d.detail}` : ''}`;
            return (
              <li
                key={d.label}
                className="group relative grid items-center gap-3 rounded-md py-1 outline-none hover:bg-ink-50/60 focus-visible:bg-ink-50"
                style={{ gridTemplateColumns: `${labelWidth} 1fr` }}
                aria-label={label}
                tabIndex={0}
              >
                <span className="truncate text-xs font-semibold text-slate-600" title={d.fullLabel || d.label}>
                  {d.label}
                </span>
                <div className="relative h-[18px] w-[calc(100%-3.5rem)]">
                  {/* hairline gridlines at 0 / 50 / 100 % of the scale */}
                  {[0, 50, 100].map((g) => (
                    <span
                      key={g}
                      aria-hidden="true"
                      className="absolute top-[-4px] h-[26px] w-px"
                      style={{ left: `${g}%`, background: 'var(--viz-grid)' }}
                    />
                  ))}
                  <div className="relative flex h-full items-center">
                    {value > 0 ? (
                      <span
                        className="block h-full shrink-0 origin-left animate-bar-grow"
                        style={{
                          width: `${Math.max(pct, 0.8)}%`,
                          background: 'var(--viz-series-1)',
                          borderRadius: '0 4px 4px 0',
                        }}
                      />
                    ) : null}
                    <span className="ml-2 shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-slate-700">
                      {format(d.value)}
                    </span>
                  </div>
                </div>
                {/* hover / focus tooltip */}
                <div
                  role="tooltip"
                  style={{ left: labelWidth }}
                  className="pointer-events-none absolute top-full z-20 mt-1 hidden min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg group-hover:block group-focus:block"
                >
                  <div className="font-semibold text-slate-900">{d.fullLabel || d.label}</div>
                  <div className="text-slate-700">{format(d.value)}</div>
                  {d.detail ? <div className="text-slate-500">{d.detail}</div> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}
