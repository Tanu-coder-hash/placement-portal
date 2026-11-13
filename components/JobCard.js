import Link from 'next/link';
import Icon from './Icon';
import { Avatar, Badge, MatchScore, Meta, SkillMatch, StatusBadge } from './ui';
import { JOB_TYPE_LABELS, formatCtc, formatDate } from '@/lib/format';

/** A job in the student's ranked list. */
export default function JobCard({ job, rank, studentSkills }) {
  const ineligible = [];
  if (!job.cgpa_ok) ineligible.push(`needs CGPA ${job.min_cgpa}`);
  if (!job.department_ok) ineligible.push(`only ${job.eligible_departments.join(', ')}`);

  return (
    <Link
      href={`/student/jobs/${job.job_id}`}
      className="card group block p-5 transition-colors hover:border-ink-300 sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="relative">
            <Avatar name={job.company_name} square size="lg" />
            {rank ? (
              <span className="absolute -left-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-ink-900 px-1.5 text-[11px] font-bold text-white ring-2 ring-white">
                {rank}
              </span>
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold leading-snug group-hover:text-ink-700">{job.title}</h3>
              <Badge tone="indigo">{JOB_TYPE_LABELS[job.job_type]}</Badge>
              {job.application_status ? <StatusBadge status={job.application_status} /> : null}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              <Meta icon="building">{job.company_name}</Meta>
              {job.location ? <Meta icon="pin">{job.location}</Meta> : null}
              <Meta icon="money">{formatCtc(job.ctc_lpa)}</Meta>
              <Meta icon="clock">Apply by {formatDate(job.application_deadline)}</Meta>
            </div>
            {ineligible.length ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                <Icon name="lock" size={13} />
                Not eligible: {ineligible.join(', ')}
              </p>
            ) : null}
            <div className="mt-3.5">
              <SkillMatch candidateSkills={studentSkills} requiredSkills={job.required_skills} max={8} />
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <MatchScore score={job.match_score} />
        </div>
      </div>
    </Link>
  );
}
