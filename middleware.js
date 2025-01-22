import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Add paths that should be protected
  const protectedPaths = ['/estimates'];
  
  // Add paths that should be accessible only to non-authenticated users
  const authPaths = ['/auth/login', '/auth/register'];

  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isAuthPath = authPaths.some(path => pathname === path);

  // Get the token using next-auth
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || 'your-secret-key'
  });

  const isAuth = !!token;

  // For debugging
  console.log('Path:', pathname);
  console.log('Is authenticated:', isAuth);
  console.log('Token:', token);

  if (isProtectedPath && !isAuth) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPath && isAuth) {
    if (token.is_approved || token.role === 'admin') {
      return NextResponse.redirect(new URL('/estimates', request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/estimates/:path*',
    '/auth/login',
    '/auth/register',
  ],
};
