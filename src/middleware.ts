
import { NextRequest, NextResponse } from 'next/server';

// This middleware is no longer needed for a static export build
// as there's no server to run it on. All logic is client-side.
export default function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [], // No routes should be processed by middleware
};
