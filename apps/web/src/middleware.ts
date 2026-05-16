import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_HOSTS = ['localhost', 'flowmail.com', 'www.flowmail.com'];

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  
  if (!host) {
    return NextResponse.next();
  }

  // Remove port if present (e.g. localhost:3000 -> localhost)
  const hostname = host.split(':')[0];

  if (DEFAULT_HOSTS.includes(hostname)) {
    return NextResponse.next();
  }

  // Initialize Supabase client
  // Using Service Role key might be safer for domain resolution if policies are strict,
  // but NEXT_PUBLIC_SUPABASE_ANON_KEY is what's usually available on the client/middleware side.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check agency_configs for this domain
  // We want to fetch branding info
  const { data: agencyConfig, error } = await supabase
    .from('agency_configs')
    .select('id, project_id, logo_url, brand_color')
    .eq('custom_domain', hostname)
    .single();

  if (agencyConfig && !error) {
    // Clone headers and add branding info
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Agency-Id', agencyConfig.id);
    requestHeaders.set('X-Agency-Project-Id', agencyConfig.project_id);
    
    // Pass along branding if needed, or layout can fetch it
    // Adding it to headers makes it available in Server Components via 'headers()'
    if (agencyConfig.logo_url) requestHeaders.set('X-Agency-Logo', agencyConfig.logo_url);
    if (agencyConfig.brand_color) requestHeaders.set('X-Agency-Color', agencyConfig.brand_color);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
