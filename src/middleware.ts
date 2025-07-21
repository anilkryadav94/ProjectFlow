
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// 1. Specify protected and public routes
const protectedRoutes = ['/'];
const publicRoutes = ['/login'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(p => path.startsWith(p)) && path !== '/login';

  // 2. Check if the current route is protected or public
  const session = await getSession();
  
  // 3. Decrypt the session from the cookie

  // 4. Redirect if the user is not authenticated
  if (isProtectedRoute && !session?.user) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }
  
  // 5. Redirect if the user is authenticated
  if (
    publicRoutes.includes(path) &&
    session?.user
  ) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
