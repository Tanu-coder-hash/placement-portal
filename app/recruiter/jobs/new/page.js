import ActionForm from '@/components/ActionForm';
import { Alert, Card, PageHeader } from '@/components/ui';
import { createJobAction } from '@/app/actions/recruiter';
import { requireUser } from '@/lib/auth';
import { listDepartments } from '@/lib/services/accounts';

export const dynamic = 'force-dynamic';

export default async function NewJobPage() {
  const user = await requireUser('RECRUITER');
  const departments = await listDepartments();

  if (user.verification_status !== 'VERIFIED') {
    return (
      <div className="space-y-6">
        <PageHeader title="Post a job" />
        <Alert tone="amber">Job posting unlocks after the placement office verifies your account.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Post a job"
        subtitle="New postings are reviewed by the placement office before students can see them."
      />
      <Card>
        <ActionForm action={createJobAction} submitLabel="Submit for approval" pendingLabel="Submitting…" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="title">
                Job title
              </label>
              <input id="title" name="title" required maxLength={150} className="input" placeholder="e.g. Backend Engineer (Graduate)" />
            </div>
            <div>
              <label className="label" htmlFor="jobType">
                Type
              </label>
              <select id="jobType" name="jobType" className="input" defaultValue="FULL_TIME">
                <option value="FULL_TIME">Full-time</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="INTERNSHIP_PPO">Internship + PPO</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="location">
                Location
              </label>
              <input id="location" name="location" maxLength={120} className="input" placeholder="Bengaluru / Remote" />
            </div>
            <div>
              <label className="label" htmlFor="ctcLpa">
                CTC (₹ lakh per annum)
              </label>
              <input id="ctcLpa" name="ctcLpa" type="number" step="0.01" min="0" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="minCgpa">
                Minimum CGPA
              </label>
              <input id="minCgpa" name="minCgpa" type="number" step="0.01" min="0" max="10" defaultValue="0" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="hiringQuota">
                Hiring quota (openings)
              </label>
              <input id="hiringQuota" name="hiringQuota" type="number" min="1" defaultValue="1" required className="input" />
              <p className="hint">The posting closes automatically when this many offers are accepted.</p>
            </div>
            <div>
              <label className="label" htmlFor="maxApplications">
                Maximum applications (optional)
              </label>
              <input id="maxApplications" name="maxApplications" type="number" min="1" className="input" />
              <p className="hint">A trigger closes the posting once this many students apply.</p>
            </div>
            <div>
              <label className="label" htmlFor="applicationDeadline">
                Application deadline
              </label>
              <input id="applicationDeadline" name="applicationDeadline" type="date" className="input" />
            </div>
          </div>

          <fieldset>
            <legend className="label">Eligible departments</legend>
            <p className="hint mb-2 mt-0">Leave all unchecked to open the role to every department.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {departments.map((d) => (
                <label key={d.department_id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" name="departmentIds" value={d.department_id} className="h-4 w-4 rounded border-slate-300" />
                  {d.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="label" htmlFor="requiredSkills">
              Key skills
            </label>
            <input id="requiredSkills" name="requiredSkills" className="input" placeholder="Java, Spring Boot, SQL, REST APIs" />
            <p className="hint">Comma-separated. Used for the skill-overlap view; ranking itself is semantic.</p>
          </div>
          <div>
            <label className="label" htmlFor="description">
              Job description
            </label>
            <textarea id="description" name="description" required rows={7} minLength={50} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="requirements">
              Requirements
            </label>
            <textarea id="requirements" name="requirements" required rows={5} minLength={20} className="input" />
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
