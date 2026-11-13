/** An error whose message is safe to show to the end user. */
export class AppError extends Error {
  constructor(message, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

const UNIQUE_MESSAGES = {
  uq_users_email: 'An account with this email already exists.',
  students_roll_number_key: 'This roll number is already registered.',
  uq_applications_job_student: 'You have already applied to this job.',
  offers_application_id_key: 'An offer has already been issued for this application.',
  uq_interviews_round: 'That interview round already exists for this application.',
};

/** Converts any thrown value (AppError, PostgreSQL error, ...) into a user-facing message. */
export function toUserMessage(err) {
  if (err instanceof AppError) return err.message;

  if (err && typeof err === 'object' && 'code' in err) {
    switch (err.code) {
      case 'P0001': // RAISE EXCEPTION inside a trigger / procedure — message written for users
        return err.message;
      case '23505':
        return UNIQUE_MESSAGES[err.constraint] || 'This record already exists.';
      case '23514':
        return 'One of the values is outside the allowed range.';
      case '23503':
        return 'A referenced record no longer exists.';
      case '22P02':
      case '22007':
      case '22008':
        return 'One of the values has an invalid format.';
      case '40001':
      case '40P01':
        return 'Another update happened at the same time. Please try again.';
      case 'ECONNREFUSED':
        return 'The database is not reachable. Is PostgreSQL running?';
      default:
        break;
    }
  }

  console.error('[unexpected error]', err);
  return 'Something went wrong. Please try again.';
}

function isNextControlFlow(err) {
  const digest = err && typeof err === 'object' ? err.digest : undefined;
  return typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND');
}

/**
 * Wraps a Server Action body. Returns { ok: true, ...data } or { ok: false, error }.
 * Client components display `error` directly.
 */
export async function runAction(fn) {
  try {
    const data = await fn();
    return { ok: true, ...(data && typeof data === 'object' ? data : {}) };
  } catch (err) {
    if (isNextControlFlow(err)) throw err;
    return { ok: false, error: toUserMessage(err) };
  }
}
