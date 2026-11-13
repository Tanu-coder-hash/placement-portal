import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function StudentLayout({ children }) {
  const user = await requireUser('STUDENT');
  const student = await one('SELECT placement_status FROM students WHERE student_id = $1', [user.user_id]);

  let banner = null;
  if (user.verification_status === 'PENDING') {
    banner = (
      <Alert tone="amber" title="Profile awaiting verification">
        The placement office has not verified your profile yet. You can complete your profile and browse matched
        jobs, but applications open once you are verified.
      </Alert>
    );
  } else if (student?.placement_status === 'PLACED') {
    banner = (
      <Alert tone="green" title="You are placed 🎉">
        You have accepted an offer. Your placement status is locked, so new applications are disabled.
      </Alert>
    );
  }

  return (
    <AppShell
      user={user}
      banner={banner}
      links={[
        { href: '/student', label: 'Dashboard', exact: true, icon: 'home' },
        { href: '/student/jobs', label: 'Matched jobs', icon: 'sparkles' },
        { href: '/student/applications', label: 'My applications', icon: 'clipboard' },
        { href: '/student/profile', label: 'Profile & resume', icon: 'user' },
      ]}
    >
      {children}
    </AppShell>
  );
}
