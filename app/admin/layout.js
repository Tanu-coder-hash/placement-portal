import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth';
import { getPendingCounts } from '@/lib/services/stats';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  const user = await requireUser('ADMIN');
  const pending = await getPendingCounts();

  return (
    <AppShell
      user={user}
      links={[
        { href: '/admin', label: 'Placement statistics', exact: true, icon: 'chart' },
        { href: '/admin/users', label: 'User verification', badge: pending.pending_users || null, icon: 'shield' },
        { href: '/admin/jobs', label: 'Job approvals', badge: pending.pending_jobs || null, icon: 'briefcase' },
        { href: '/admin/database', label: 'Database', icon: 'database' },
      ]}
    >
      {children}
    </AppShell>
  );
}
