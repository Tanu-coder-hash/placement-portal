import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import ActionForm from '@/components/ActionForm';
import { loginAction } from '@/app/actions/auth';
import { getCurrentUser } from '@/lib/auth';
import { dashboardPathFor } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }) {
  const params = (await searchParams) || {};
  const user = await getCurrentUser();
  if (user) redirect(dashboardPathFor(user.role));

  const showDemo = process.env.NODE_ENV !== 'production';

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Students, recruiters and the placement office all sign in here."
      footer={
        <>
          New here?{' '}
          <Link href="/register" className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <ActionForm action={loginAction} submitLabel="Sign in" pendingLabel="Signing in…" submitClassName="btn-primary w-full">
        <input type="hidden" name="next" value={typeof params.next === 'string' ? params.next : ''} />
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
      </ActionForm>

      {showDemo ? (
        <div className="mt-6 rounded-xl bg-ink-50 p-4 text-xs text-slate-600">
          <div className="mb-1 font-semibold text-ink-900">Demo accounts (after <code>npm run db:seed</code>)</div>
          <ul className="space-y-0.5">
            <li>
              Admin: <code>{process.env.ADMIN_EMAIL || 'placement.officer@university.edu'}</code> / value of{' '}
              <code>ADMIN_PASSWORD</code>
            </li>
            <li>
              Student: <code>sneha.reddy@student.university.edu</code> (has a pending offer)
            </li>
            <li>
              Recruiter: <code>hiring@novabyte.example.com</code>
            </li>
            <li>
              Demo password: value of <code>SEED_DEMO_PASSWORD</code>
            </li>
          </ul>
        </div>
      ) : null}
    </AuthLayout>
  );
}
