import Link from 'next/link';

/** Brand mark: a marigold seal (the stamp on an offer letter) with the wordmark. */
export default function Logo({ onDark = false, href = '/' }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-lg">
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-marigold-400 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0C1333" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className={`font-display text-lg font-bold tracking-tight ${onDark ? 'text-white' : 'text-ink-900'}`}>PlacementPortal</span>
    </Link>
  );
}
