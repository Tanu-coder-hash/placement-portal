'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

export default function NavLinks({ links }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Main">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3 whitespace-nowrap rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? 'bg-white/10 text-white' : 'text-ink-200 hover:bg-white/5 hover:text-white'
            }`}
          >
            {active ? <span className="absolute inset-y-2 left-0 hidden w-[3px] rounded-full bg-marigold-400 lg:block" /> : null}
            {link.icon ? (
              <Icon name={link.icon} size={18} className={active ? 'text-marigold-300' : 'text-ink-300 group-hover:text-ink-100'} />
            ) : null}
            <span className="flex-1">{link.label}</span>
            {link.badge ? (
              <span className="rounded-full bg-marigold-400 px-1.5 text-[11px] font-bold text-ink-950">{link.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
