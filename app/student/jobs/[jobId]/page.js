import Link from 'next/link';
import { notFound } from 'next/navigation';
import ActionForm from '@/components/ActionForm';
import { Alert, Badge, Card, DefinitionList, MatchScore, PageHeader, SkillMatch, StatusBadge } from '@/components/ui';
import { applyToJobAction } from '@/app/actions/student';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { CLOSED_REASON_LABELS, JOB_TYPE_LABELS, formatCtc, formatDate, matchBand } from '@/lib/format';
import { getJob } from '@/lib/services/jobs';
import { studentJobSimilarity } from '@/lib/services/matching';

export const dynamic = 'force-dynamic';

export default async function StudentJobDetail({ params }) {
  const user = await requireUser('STUDENT');
  const { jobId } = await params;
  const jid = Number(jobId);
  if (!Number.isInteger(jid)) notFound();

  const job = await getJob(jid);
  if (!job || !['OPEN', 'CLOSED'].includes(job.status)) notFound();

  const [student, application, score] = await Promise.all([
    one(
      `SELECT s.cgpa, s.skills, s.placement_status, d.code AS department_code
         FROM students s JOIN departments d ON d.department_id = s.department_id
        WHERE s.student_id = $1`,
      [user.user_id],
    ),
    one('SELECT application_id, status, applied_at FROM applications WHERE job_id = $1 AND student_id = $2', [
      jid,
      user.user_id,
    ]),
    studentJobSimilarity(user.user_id, jid),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const blockers = [];
  if (user.verification_status !== 'VERIFIED') blockers.push('Your profile is not verified yet.');
  if (student.placement_status === 'PLACED') blockers.push('You have already accepted an offer.');
  if (job.status !== 'OPEN') blockers.push(`This job is closed (${CLOSED_REASON_LABELS[job.closed_reason] || 'closed'}).`);
  if (job.application_deadline && job.application_deadline < today) blockers.push('The application deadline has passed.');
  if (student.cgpa === null || student.cgpa < job.min_cgpa) blockers.push(`A minimum CGPA of ${job.min_cgpa} is required.`);
  if (job.eligible_departments.length && !job.eligible_departments.includes(student.department_code)) {
    blockers.push(`Only open to ${job.eligible_departments.join(', ')}.`);
  }
  const band = matchBand(score);

  return (
    <div className="space-y-6">
      <Link href="/student/jobs" className="text-sm text-brand-700 hover:underline">
        ← Back to matched jobs
      </Link>
      <PageHeader
        title={job.title}
        subtitle={`${job.company_name}${job.location ? ` · ${job.location}` : ''}`}
        actions={
          <>
            <Badge tone="slate">{JOB_TYPE_LABELS[job.job_type]}</Badge>
            <StatusBadge status={job.status} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="About the role">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{job.description}</p>
          </Card>
          <Card title="Requirements">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{job.requirements}</p>
            {job.required_skills.length ? (
              <div className="mt-4">
                <div className="mb-2 field-label">
                  Required skills (✓ = on your profile)
                </div>
                <SkillMatch candidateSkills={student.skills} requiredSkills={job.required_skills} max={30} />
              </div>
            ) : null}
          </Card>
          {job.company_description ? (
            <Card title={`About ${job.company_name}`}>
              <p className="whitespace-pre-line text-sm text-slate-700">{job.company_description}</p>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card title="Your semantic match">
            <MatchScore score={score} />
            <p className="mt-3 text-xs text-slate-500">
              {score === null
                ? 'Complete your profile so it can be embedded and compared with this job.'
                : `${band.label}. Cosine similarity between your profile vector and this job’s vector (all-MiniLM-L6-v2, 384 dimensions).`}
            </p>
          </Card>

          <Card title="Details">
            <DefinitionList
              items={[
                ['CTC', formatCtc(job.ctc_lpa)],
                ['Minimum CGPA', job.min_cgpa],
                ['Deadline', formatDate(job.application_deadline)],
                ['Openings', job.hiring_quota],
                ['Departments', job.eligible_departments.length ? job.eligible_departments.join(', ') : 'All'],
                ['Applications', job.max_applications ? `${job.application_count} / ${job.max_applications}` : job.application_count],
              ]}
            />
          </Card>

          <Card title="Apply">
            {application ? (
              <div className="space-y-3 text-sm">
                <p>
                  You applied on {formatDate(application.applied_at)}. Current status:{' '}
                  <StatusBadge status={application.status} />
                </p>
                <Link href="/student/applications" className="btn-secondary btn-sm">
                  Track application
                </Link>
              </div>
            ) : blockers.length ? (
              <Alert tone="amber" title="You cannot apply right now">
                <ul className="list-disc pl-4">
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </Alert>
            ) : (
              <ActionForm action={applyToJobAction} submitLabel="Submit application" pendingLabel="Submitting…">
                <input type="hidden" name="jobId" value={job.job_id} />
                <div>
                  <label className="label" htmlFor="coverNote">
                    Note to the recruiter (optional)
                  </label>
                  <textarea id="coverNote" name="coverNote" rows={4} maxLength={2000} className="input" />
                </div>
              </ActionForm>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
