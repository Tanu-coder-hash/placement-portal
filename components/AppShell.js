// Authenticated layout: ink sidebar with role navigation + content canvas.
import { logoutAction } from '@/app/actions/auth';
import Icon from './Icon';
import Logo from './Logo';
import NavLinks from './NavLinks';
import { Avatar } from './ui';

const ROLE_LABEL = { STUDENT: 'Student', RECRUITER: 'Recruiter', ADMIN: 'Placement officer' };

export default function AppShell({ user, links, banner = null, children }) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="bg-ink-900 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex items-center justify-between px-5 py-4 lg:px-6 lg:py-7">
          <Logo onDark />
          <form action={logoutAction} className="lg:hidden">
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-200 hover:bg-white/10 hover:text-white">
              <Icon name="logout" size={16} />
              Sign out
            </button>
          </form>
        </div>

        <div className="px-3 pb-3 lg:flex-1 lg:px-4">
          <p className="mb-2 hidden px-3 text-xs font-medium text-ink-300 lg:block">{ROLE_LABEL[user.role]} workspace</p>
          <NavLinks links={links} />
        </div>

        <div className="hidden border-t border-white/10 p-4 lg:block">
          <div className="flex items-center gap-3 px-1">
            <Avatar name={user.full_name} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{user.full_name}</div>
              <div className="truncate text-xs text-ink-300">{user.email}</div>
            </div>
          </div>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon name="logout" size={17} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 lg:py-10">
          {banner ? <div className="mb-6">{banner}</div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
