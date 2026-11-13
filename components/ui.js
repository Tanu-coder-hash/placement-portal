// Presentational building blocks (usable from Server and Client Components).
import Icon from './Icon';
import { STATUS_TONES, matchBand, skillOverlap, statusLabel } from '@/lib/format';

const TONES = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-sky-50 text-sky-800',
  indigo: 'bg-ink-50 text-ink-700',
  violet: 'bg-violet-50 text-violet-800',
  green: 'bg-emerald-50 text-emerald-800',
  amber: 'bg-marigold-50 text-marigold-800',
  red: 'bg-red-50 text-red-700',
};

const DOTS = {
  slate: 'bg-slate-400',
  blue: 'bg-sky-500',
  indigo: 'bg-ink-500',
  violet: 'bg-violet-500',
  green: 'bg-emerald-500',
  amber: 'bg-marigold-500',
  red: 'bg-red-500',
};

export function Badge({ tone = 'slate', children, className = '', dot = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone] || TONES.slate} ${className}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone] || DOTS.slate}`} /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONES[status] || 'slate'} dot>
      {statusLabel(status)}
    </Badge>
  );
}

export function PageHeader({ title, subtitle, actions, icon }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        {icon ? (
          <span className="mt-1 hidden h-11 w-11 place-items-center rounded-xl bg-white text-ink-700 ring-1 ring-line sm:grid">
            <Icon name={icon} size={22} />
          </span>
        ) : null}
        <div>
          <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{title}</h1>
          {subtitle ? <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, description, actions, children, className = '', bodyClassName = 'p-6', icon }) {
  return (
    <section className={`card ${className}`}>
      {title || actions ? (
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div className="flex items-start gap-3">
            {icon ? (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-700">
                <Icon name={icon} size={18} />
              </span>
            ) : null}
            <div>
              {title ? <h2 className="text-lg font-semibold leading-snug">{title}</h2> : null}
              {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

const STAT_TONES = {
  default: { box: 'border-line bg-white', label: 'text-muted', icon: 'bg-ink-50 text-ink-700', value: 'text-ink-900', hint: 'text-muted' },
  ink: { box: 'border-ink-900 bg-ink-900', label: 'text-ink-200', icon: 'bg-white/10 text-marigold-300', value: 'text-white', hint: 'text-ink-200' },
  marigold: { box: 'border-marigold-200 bg-marigold-50', label: 'text-marigold-800', icon: 'bg-marigold-100 text-marigold-700', value: 'text-ink-900', hint: 'text-marigold-800' },
};

export function Stat({ label, value, hint, icon, tone = 'default' }) {
  const t = STAT_TONES[tone] || STAT_TONES.default;
  return (
    <div className={`rounded-panel border p-5 ${t.box}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-sm font-medium ${t.label}`}>{label}</span>
        {icon ? (
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${t.icon}`}>
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
      <div className={`mt-2 font-display text-[30px] font-bold leading-none ${t.value}`}>{value}</div>
      {hint ? <div className={`mt-2 text-xs ${t.hint}`}>{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action, icon = 'inbox' }) {
  return (
    <div className="panel-quiet px-6 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ink-50 text-ink-600">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

const ALERTS = {
  amber: { box: 'border-marigold-200 bg-marigold-50 text-marigold-800', icon: 'clock' },
  red: { box: 'border-red-200 bg-red-50 text-red-900', icon: 'alert' },
  green: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: 'award' },
  blue: { box: 'border-ink-200 bg-ink-50 text-ink-900', icon: 'info' },
};

export function Alert({ tone = 'amber', title, children, icon }) {
  const a = ALERTS[tone] || ALERTS.amber;
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3.5 text-sm ${a.box}`}>
      <Icon name={icon || a.icon} size={18} className="mt-0.5" />
      <div>
        {title ? <div className="font-semibold">{title}</div> : null}
        {children ? <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div> : null}
      </div>
    </div>
  );
}

/** Ring gauge for a cosine-similarity score. Marigold = excellent match. */
export function MatchDial({ score, size = 56, label }) {
  if (score === null || score === undefined) {
    return (
      <span
        className="inline-grid shrink-0 place-items-center rounded-full border border-dashed border-line text-[10px] font-medium text-muted"
        style={{ width: size, height: size }}
        title="Not indexed yet"
      >
        n/a
      </span>
    );
  }
  const pct = Math.max(0, Math.min(1, Number(score)));
  const stroke = size >= 80 ? 8 : size >= 50 ? 5 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const excellent = pct >= 0.6;
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      title={label || `Cosine similarity ${Number(score).toFixed(3)}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E3E7F0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={excellent ? '#F0A202' : '#2B3FA0'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="animate-dial-fill"
          style={{ '--dial-circumference': c, '--dial-offset': offset }}
        />
      </svg>
      <span className="absolute font-display font-bold tabular-nums text-ink-900" style={{ fontSize: Math.round(size * 0.27) }}>
        {Math.round(pct * 100)}
        <span style={{ fontSize: '0.6em' }}>%</span>
      </span>
    </span>
  );
}

/** Dial + qualitative label. */
export function MatchScore({ score, compact = false }) {
  const band = matchBand(score);
  return (
    <div className="flex items-center gap-3">
      <MatchDial score={score} size={compact ? 40 : 58} />
      {!compact ? (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink-900">{band.label}</div>
          <div className="text-xs text-muted">semantic fit</div>
        </div>
      ) : null}
    </div>
  );
}

/** Required skills, highlighting the ones the candidate has. */
export function SkillMatch({ candidateSkills, requiredSkills, max = 10 }) {
  if (!requiredSkills?.length) return null;
  const { matched, missing } = skillOverlap(candidateSkills, requiredSkills);
  const items = [...matched.map((s) => [s, true]), ...missing.map((s) => [s, false])].slice(0, max);
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([skill, ok]) => (
        <span key={skill} className={ok ? 'chip-match' : 'chip-missing'}>
          {ok ? <Icon name="check" size={12} strokeWidth={2.5} /> : null}
          {skill}
        </span>
      ))}
    </div>
  );
}

export function SkillChips({ skills, max = 12 }) {
  if (!skills?.length) return <span className="text-xs text-muted">No skills listed</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.slice(0, max).map((s) => (
        <span key={s} className="chip">
          {s}
        </span>
      ))}
      {skills.length > max ? <span className="text-xs text-muted">+{skills.length - max} more</span> : null}
    </div>
  );
}

export function DefinitionList({ items, columns = 2 }) {
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-4 ${columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
      {items.filter(Boolean).map(([term, value]) => (
        <div key={term}>
          <dt className="field-label">{term}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink-900">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

const AVATAR_TONES = [
  'bg-ink-100 text-ink-800',
  'bg-marigold-100 text-marigold-800',
  'bg-emerald-100 text-emerald-800',
  'bg-rose-100 text-rose-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
];

function initials(name = '') {
  return name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter((w) => w && /[A-Za-z]/.test(w[0]))
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function hashTone(name = '') {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

/** Initials avatar for people (round) or companies (square). */
export function Avatar({ name, size = 'md', square = false, className = '' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };
  return (
    <span
      className={`inline-grid shrink-0 place-items-center font-display font-bold ${square ? 'rounded-xl' : 'rounded-full'} ${sizes[size] || sizes.md} ${hashTone(name)} ${className}`}
      aria-hidden="true"
    >
      {initials(name) || '?'}
    </span>
  );
}

/** Icon + text, used instead of dot-separated meta strings. */
export function Meta({ icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm text-muted ${className}`}>
      <Icon name={icon} size={15} className="text-slate-400" />
      {children}
    </span>
  );
}
