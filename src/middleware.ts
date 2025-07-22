
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const SESSION_COOKIE_NAME = 'projectflow-session';

const protectedRoutes = ['/'];
const publicRoutes = ['/login'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(p => path.startsWith(p)) && path !== '/login';

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  // A simple check for the presence of the cookie.
  // For robust security, the token should be verified using Firebase Admin SDK on the backend.
  const isAuthenticated = !!sessionCookie;

  if (isProtectedRoute && !isAuthenticated) {
    // Clear the potentially invalid cookie
    const response = NextResponse.redirect(new URL('/login', req.nextUrl));
    response.cookies.set(SESSION_COOKIE_NAME, '', { expires: new Date(0) });
    return response;
  }
  
  if (publicRoutes.includes(path) && isAuthenticated) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
