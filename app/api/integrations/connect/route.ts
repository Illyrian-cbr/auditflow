import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { getQuickBooksAuthUrl } from '@/lib/integrations/quickbooks';
import { getXeroAuthUrl } from '@/lib/integrations/xero';
import type { IntegrationProvider } from '@/types';

/**
 * POST /api/integrations/connect
 *
 * Initiates an OAuth2 connection flow for the specified accounting provider.
 * Returns the authorization URL that the client should redirect the user to.
 *
 * Request body: { provider: 'quickbooks' | 'xero' }
 * Response: { url: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authClient = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const provider = body.provider as IntegrationProvider;

    if (!provider || !['quickbooks', 'xero'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "quickbooks" or "xero".' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        { error: 'APP_URL or NEXT_PUBLIC_APP_URL environment variable is not configured.' },
        { status: 500 }
      );
    }

    const redirectUri = `${appUrl}/api/integrations/${provider}/callback`;

    let authUrl: string;
    if (provider === 'quickbooks') {
      authUrl = getQuickBooksAuthUrl(redirectUri);
    } else {
      authUrl = getXeroAuthUrl(redirectUri);
    }

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Integration connect error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initiate connection';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
