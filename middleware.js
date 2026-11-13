// Role-based route protection (first line of defence).
// Every page and Server Action re-checks the role on the server as well.
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, dashboardPathFor, verifySession } from './lib/jwt.js';

const PROTECTED = [
  { prefix: '/student', role: 'STUDENT' },
  { prefix: '/recruiter', role: 'RECRUITER' },
  { prefix: '/admin', role: 'ADMIN' },
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const rule = PROTECTED.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (!rule) return NextResponse.next();

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (session.role !== rule.role) {
    return NextResponse.redirect(new URL(dashboardPathFor(session.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/student/:path*', '/recruiter/:path*', '/admin/:path*'],
};
