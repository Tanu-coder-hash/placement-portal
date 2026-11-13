import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import RegisterForm from '@/components/RegisterForm';
import { getCurrentUser } from '@/lib/auth';
import { dashboardPathFor } from '@/lib/jwt';
import { listDepartments } from '@/lib/services/accounts';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(dashboardPathFor(user.role));
  const departments = await listDepartments();

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Students and recruiters register here. Placement officer accounts are created by the institute."
      footer={
        <>
          Already registered?{' '}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm departments={departments} />
    </AuthLayout>
  );
}
