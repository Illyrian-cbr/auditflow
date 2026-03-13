import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Create a Supabase client that can read/write cookies in middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Set cookies on the response (for the browser)
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this keeps auth tokens alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // White-label: check if hostname matches a custom partner domain (scaffold)
  const hostname = request.headers.get('host') || '';
  const mainDomain =
    process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '').replace('http://', '') ||
    'localhost:3000';
  if (hostname && hostname !== mainDomain && !hostname.includes('localhost')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-partner-domain', hostname);
    supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
  }

  // If no authenticated user and trying to access dashboard, redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
