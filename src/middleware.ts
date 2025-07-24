import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './lib/auth'; // We can't use this server-side directly with our setup

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // This is a simplified check. A robust solution uses JWTs or server-side session validation.
  const sessionToken = req.cookies.get('firebase-session');

  // Allow access to login page regardless of auth state
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }
  
  // If trying to access any other page without a session, redirect to login
  if (!sessionToken && !pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except for API routes, static files, and image optimization files
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
