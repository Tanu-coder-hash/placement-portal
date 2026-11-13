// Session tokens (JWT, HS256) — Edge-runtime safe, used by middleware and server code.
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'pp_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set in .env and be at least 32 characters long.');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession({ userId, role, name }) {
  return new SignJWT({ role, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Returns { userId, role, name } or null when the token is missing/invalid/expired. */
export async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    return { userId: Number(payload.sub), role: payload.role, name: payload.name };
  } catch {
    return null;
  }
}

export function dashboardPathFor(role) {
  switch (role) {
    case 'STUDENT':
      return '/student';
    case 'RECRUITER':
      return '/recruiter';
    case 'ADMIN':
      return '/admin';
    default:
      return '/login';
  }
}
