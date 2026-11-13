// Server-side session helpers (Server Components, Server Actions, Route Handlers).
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { one } from './db.js';
import { AppError } from './errors.js';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  dashboardPathFor,
  signSession,
  verifySession,
} from './jwt.js';

function cookieIsSecure() {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === 'true';
  return false;
}

export async function createSessionCookie(user) {
  const token = await signSession({ userId: user.user_id, role: user.role, name: user.full_name });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieIsSecure(),
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/**
 * The logged-in user, re-read from the database on every request so that
 * verification / role changes by the placement officer apply immediately.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await one(
    `SELECT user_id, email, full_name, role, verification_status, created_at
       FROM users WHERE user_id = $1`,
    [session.userId],
  );
  if (!user || user.role !== session.role) return null;
  return user;
}

/** For pages/layouts: redirects to /login or to the user's own dashboard. */
export async function requireUser(role) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (role && user.role !== role) redirect(dashboardPathFor(user.role));
  return user;
}

/**
 * For Server Actions: throws a user-facing AppError instead of redirecting.
 * options.verified = true also requires the account to be verified.
 */
export async function requireActionUser(role, { verified = false } = {}) {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Your session has expired. Please sign in again.', 'UNAUTHENTICATED');
  if (role && user.role !== role) throw new AppError('You do not have permission to do that.', 'FORBIDDEN');
  if (verified && user.verification_status !== 'VERIFIED') {
    throw new AppError('Your account is awaiting verification by the placement office.', 'NOT_VERIFIED');
  }
  return user;
}
