import Logo from './Logo';
import { MatchDial } from './ui';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-ink-900 p-12 lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -left-40 h-[520px] w-[520px] rounded-full border-[56px] border-marigold-400/10"
        />
        <Logo onDark />
        <div className="relative mt-auto max-w-md">
          <p className="font-display text-[34px] font-bold leading-[1.1] tracking-tight text-white">
            Placement season, without the spreadsheet.
          </p>
          <p className="mt-4 text-ink-200">
            Every resume is read for meaning, every offer is settled in a single transaction, and the placement office
            sees results the moment they happen.
          </p>
          <div className="mt-10 flex items-center gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <MatchDial score={0.83} size={56} />
            <div className="text-sm">
              <div className="font-semibold text-white">83% semantic fit</div>
              <div className="text-ink-200">Java backend resume against a Spring Boot job description</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center bg-canvas px-4 py-12 sm:px-8">
        <div className="w-full max-w-lg">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="card p-7 sm:p-9">
            <h1 className="text-[28px] font-bold leading-tight">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}
            <div className="mt-7">{children}</div>
          </div>
          {footer ? <div className="mt-5 text-center text-sm text-muted">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
