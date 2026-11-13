import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function RecruiterLayout({ children }) {
  const user = await requireUser('RECRUITER');

  const banner =
    user.verification_status === 'PENDING' ? (
      <Alert tone="amber" title="Account awaiting verification">
        The placement office is reviewing your company account. You can look around, but posting jobs and managing
        candidates unlocks once you are verified.
      </Alert>
    ) : null;

  return (
    <AppShell
      user={user}
      banner={banner}
      links={[
        { href: '/recruiter', label: 'My job postings', exact: true, icon: 'briefcase' },
        { href: '/recruiter/jobs/new', label: 'Post a job', exact: true, icon: 'plus' },
        { href: '/recruiter/interviews', label: 'Interviews', icon: 'calendar' },
        { href: '/recruiter/search', label: 'AI talent search', icon: 'search' },
      ]}
    >
      {children}
    </AppShell>
  );
}
