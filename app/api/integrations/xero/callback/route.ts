import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { createServerClient } from '@/lib/supabase';
import { exchangeXeroCode } from '@/lib/integrations/xero';
import { encrypt } from '@/lib/integrations/token-encryption';

/**
 * GET /api/integrations/xero/callback
 *
 * OAuth2 callback handler for Xero.
 * Receives the authorization code, exchanges it for tokens,
 * encrypts tokens, stores in the integrations table, and
 * redirects the user back to the integrations dashboard.
 *
 * Query params: code, state
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user — the session cookie should still be valid from the connect flow
    const authClient = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
      return NextResponse.redirect(
        `${appUrl}/login?error=auth_required`
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';

    // Handle OAuth error (user denied access, etc.)
    if (errorParam) {
      console.error('Xero OAuth error:', errorParam);
      return NextResponse.redirect(
        `${appUrl}/dashboard/integrations?error=${encodeURIComponent(errorParam)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/integrations?error=missing_code`
      );
    }

    // Exchange authorization code for tokens
    const redirectUri = `${appUrl}/api/integrations/xero/callback`;
    const tokens = await exchangeXeroCode(code, redirectUri);

    // Encrypt tokens before storage
    const accessTokenEncrypted = encrypt(tokens.access_token);
    const refreshTokenEncrypted = encrypt(tokens.refresh_token);

    // Calculate token expiration timestamp
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Upsert integration record (update if already exists for this user+provider)
    const serverSupabase = createServerClient();
    const { error: upsertError } = await serverSupabase
      .from('integrations')
      .upsert(
        {
          user_id: user.id,
          provider: 'xero' as const,
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          token_expires_at: tokenExpiresAt,
          tenant_id: tokens.tenant_id,
          is_active: true,
        },
        {
          onConflict: 'user_id,provider',
        }
      );

    if (upsertError) {
      console.error('Failed to store Xero integration:', upsertError);
      return NextResponse.redirect(
        `${appUrl}/dashboard/integrations?error=storage_failed`
      );
    }

    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations?connected=xero`
    );
  } catch (error) {
    console.error('Xero callback error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
    const message = error instanceof Error ? error.message : 'callback_failed';
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations?error=${encodeURIComponent(message)}`
    );
  }
}
