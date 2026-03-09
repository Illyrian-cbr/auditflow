import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Browser client — handles PKCE flow and persists sessions to cookies
// Use this in all client components ('use client')
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server client with service role — bypasses RLS
// Use this in API routes / server actions only
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
