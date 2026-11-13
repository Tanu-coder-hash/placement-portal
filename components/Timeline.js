import { formatDateTime, statusLabel } from '@/lib/format';

/** Application milestones from application_status_history (written by a trigger). */
export default function Timeline({ history }) {
  if (!history?.length) return null;
  return (
    <ol className="relative">
      {history.map((h, idx) => {
        const last = idx === history.length - 1;
        const good = ['ACCEPTED', 'OFFERED'].includes(h.new_status);
        const bad = ['REJECTED', 'WITHDRAWN'].includes(h.new_status);
        return (
          <li key={`${h.changed_at}-${idx}`} className="relative flex gap-3 pb-4 last:pb-0">
            {!last ? <span aria-hidden="true" className="absolute left-[7px] top-5 h-[calc(100%-12px)] w-px bg-line" /> : null}
            <span
              aria-hidden="true"
              className={`relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-[3px] ${
                last
                  ? good
                    ? 'border-marigold-200 bg-marigold-500'
                    : bad
                      ? 'border-red-100 bg-red-500'
                      : 'border-ink-100 bg-ink-600'
                  : 'border-white bg-slate-300 ring-1 ring-line'
              }`}
            />
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${last ? 'text-ink-900' : 'text-slate-600'}`}>{statusLabel(h.new_status)}</div>
              <div className="text-xs text-muted">{formatDateTime(h.changed_at)}</div>
              {h.note ? <div className="mt-0.5 text-xs text-slate-500">{h.note}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
