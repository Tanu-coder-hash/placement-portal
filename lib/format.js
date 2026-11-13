// Display helpers shared by server and client components.

const TIME_ZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

export const STATUS_LABELS = {
  // users
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  // placement
  UNPLACED: 'Unplaced',
  PLACED: 'Placed',
  // jobs
  PENDING_APPROVAL: 'Pending approval',
  OPEN: 'Open',
  CLOSED: 'Closed',
  // applications
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  INTERVIEWING: 'Interviewing',
  OFFERED: 'Offered',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  // interviews
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  PASSED: 'Passed',
  FAILED: 'Failed',
  // offers
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

export const STATUS_TONES = {
  PENDING: 'amber',
  VERIFIED: 'green',
  UNPLACED: 'slate',
  PLACED: 'green',
  PENDING_APPROVAL: 'amber',
  OPEN: 'green',
  CLOSED: 'slate',
  APPLIED: 'blue',
  SHORTLISTED: 'indigo',
  INTERVIEWING: 'violet',
  OFFERED: 'amber',
  ACCEPTED: 'green',
  REJECTED: 'red',
  WITHDRAWN: 'slate',
  SCHEDULED: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'slate',
  PASSED: 'green',
  FAILED: 'red',
  DECLINED: 'slate',
  EXPIRED: 'slate',
  REVOKED: 'red',
};

export const CLOSED_REASON_LABELS = {
  APPLICATION_LIMIT_REACHED: 'Application limit reached',
  HIRING_QUOTA_FILLED: 'Hiring quota filled',
  DEADLINE_PASSED: 'Deadline passed',
  CLOSED_BY_RECRUITER: 'Closed by recruiter',
  CLOSED_BY_ADMIN: 'Closed by placement office',
};

export const JOB_TYPE_LABELS = {
  FULL_TIME: 'Full-time',
  INTERNSHIP: 'Internship',
  INTERNSHIP_PPO: 'Internship + PPO',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || '—';
}

export function formatDate(value) {
  if (!value) return '—';
  // DATE columns arrive as 'YYYY-MM-DD' strings
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  const timeZone = typeof value === 'string' && value.length === 10 ? 'UTC' : TIME_ZONE;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

export function formatCtc(lpa) {
  if (lpa === null || lpa === undefined) return '—';
  return `₹${Number(lpa).toLocaleString('en-IN', { maximumFractionDigits: 2 })} LPA`;
}

export function formatPercent(fraction, digits = 0) {
  if (fraction === null || fraction === undefined || Number.isNaN(Number(fraction))) return '—';
  return `${(Number(fraction) * 100).toFixed(digits)}%`;
}

/** Qualitative band for a cosine similarity score (all-MiniLM-L6-v2 scale). */
export function matchBand(score) {
  if (score === null || score === undefined) return { label: 'Not indexed', tone: 'slate' };
  if (score >= 0.6) return { label: 'Excellent match', tone: 'green' };
  if (score >= 0.45) return { label: 'Strong match', tone: 'blue' };
  if (score >= 0.3) return { label: 'Moderate match', tone: 'amber' };
  return { label: 'Weak match', tone: 'slate' };
}

/** Case-insensitive intersection of two skill lists. */
export function skillOverlap(candidateSkills = [], requiredSkills = []) {
  const have = new Set((candidateSkills || []).map((s) => s.trim().toLowerCase()));
  const matched = [];
  const missing = [];
  for (const skill of requiredSkills || []) {
    (have.has(skill.trim().toLowerCase()) ? matched : missing).push(skill);
  }
  return { matched, missing };
}

/** "react, Node.js ,  SQL" -> ['react', 'Node.js', 'SQL'] (deduplicated, max 40) */
export function parseList(value) {
  const seen = new Set();
  const out = [];
  for (const raw of String(value || '').split(/[,\n]/)) {
    const item = raw.trim().replace(/\s+/g, ' ');
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item.slice(0, 60));
    if (out.length >= 40) break;
  }
  return out;
}
