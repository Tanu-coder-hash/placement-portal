import Link from 'next/link';
import ActionButton from '@/components/ActionButton';
import { Badge, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { verifyUserAction } from '@/app/actions/admin';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { listUsersForVerification } from '@/lib/services/accounts';

export const dynamic = 'force-dynamic';

const FILTERS = [
  ['PENDING', 'Pending'],
  ['VERIFIED', 'Verified'],
  ['REJECTED', 'Rejected'],
  ['ALL', 'All'],
];

export default async function AdminUsersPage({ searchParams }) {
  await requireUser('ADMIN');
  const sp = (await searchParams) || {};
  const status = FILTERS.some(([k]) => k === sp.status) ? sp.status : 'PENDING';
  const role = ['STUDENT', 'RECRUITER'].includes(sp.role) ? sp.role : null;
  const users = await listUsersForVerification({ status: status === 'ALL' ? null : status, role });

  const href = (s, r) => `/admin/users?status=${s}${r ? `&role=${r}` : ''}`;

  return (
    <div className="space-y-5">
      <PageHeader title="User verification" subtitle="Verified students can apply; verified recruiters can post jobs and manage candidates." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {FILTERS.map(([key, label]) => (
            <Link
              key={key}
              href={href(key, role)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === key ? 'bg-white shadow-sm' : 'text-slate-600'}`}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 text-sm">
          {[
            [null, 'Everyone'],
            ['STUDENT', 'Students'],
            ['RECRUITER', 'Recruiters'],
          ].map(([r, label]) => (
            <Link
              key={label}
              href={href(status, r)}
              className={`rounded-md px-3 py-1.5 ${role === r ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState title="Nothing here" description="No users match this filter." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Details</th>
                <th>Registered</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td>
                    <div className="font-medium text-slate-900">{u.full_name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td>
                    <Badge tone={u.role === 'STUDENT' ? 'blue' : 'violet'}>{u.role === 'STUDENT' ? 'Student' : 'Recruiter'}</Badge>
                  </td>
                  <td className="text-xs text-slate-600">
                    {u.role === 'STUDENT' ? (
                      <>
                        {u.roll_number} · {u.department_code} · {u.graduation_year} · CGPA {u.cgpa}
                        <div>
                          {u.has_resume ? (
                            <a href={`/api/resume/${u.user_id}`} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                              View resume
                            </a>
                          ) : (
                            'No resume yet'
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-medium text-slate-800">{u.company_name}</div>
                        {u.designation ? <div>{u.designation}</div> : null}
                        {u.company_website ? (
                          <a href={u.company_website} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                            {u.company_website}
                          </a>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{formatDate(u.created_at)}</td>
                  <td>
                    <StatusBadge status={u.verification_status} />
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {u.verification_status !== 'VERIFIED' ? (
                        <ActionButton action={verifyUserAction} args={[u.user_id, 'VERIFIED']} className="btn-success btn-sm" showMessage={false}>
                          Verify
                        </ActionButton>
                      ) : null}
                      {u.verification_status !== 'REJECTED' ? (
                        <ActionButton
                          action={verifyUserAction}
                          args={[u.user_id, 'REJECTED']}
                          className="btn-ghost btn-sm text-red-600"
                          confirm={`Reject ${u.full_name}? They will not be able to sign in.`}
                          showMessage={false}
                        >
                          Reject
                        </ActionButton>
                      ) : (
                        <ActionButton action={verifyUserAction} args={[u.user_id, 'PENDING']} className="btn-ghost btn-sm" showMessage={false}>
                          Reset
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
