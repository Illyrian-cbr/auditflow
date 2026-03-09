import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for use in API Route Handlers (app/api/*).
 * Reads auth cookies so the session set by createBrowserClient is accessible.
 * Use this instead of the exported `supabase` browser client in server routes.
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe to ignore in Route Handlers — middleware handles session refresh
          }
        },
      },
    }
  );
}
