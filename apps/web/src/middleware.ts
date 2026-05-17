import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPrisma } from '@flowmail/db';

const DEFAULT_HOSTS = ['localhost', 'flowmail.com', 'www.flowmail.com'];

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const path = request.nextUrl.pathname;

  // Better Auth Session Check
  // Note: Better Auth uses cookies for session management. 
  // We check for the session cookie directly or via the API.
  const sessionCookie = request.cookies.get("better-auth.session_token");

  // Protect dashboard and flows
  const isProtectedRoute = path === '/' || path.startsWith('/flows') || path.startsWith('/billing');
  const isAuthRoute = path.startsWith('/login');

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!host) {
    return NextResponse.next();
  }

  const hostname = host.split(':')[0];

  if (DEFAULT_HOSTS.includes(hostname)) {
    return NextResponse.next();
  }

  const prisma = getPrisma();

  try {
    const agencyConfig = await prisma.agencyConfig.findUnique({
      where: { customDomain: hostname },
      select: { id: true, projectId: true, logoUrl: true, brandColor: true }
    });

    if (agencyConfig) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('X-Agency-Id', agencyConfig.id);
      requestHeaders.set('X-Agency-Project-Id', agencyConfig.projectId);
      
      if (agencyConfig.logoUrl) requestHeaders.set('X-Agency-Logo', agencyConfig.logoUrl);
      if (agencyConfig.brandColor) requestHeaders.set('X-Agency-Color', agencyConfig.brandColor);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  } catch (err) {
    console.error('Middleware agency config error:', err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
