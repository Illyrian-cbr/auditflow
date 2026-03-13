/**
 * Xero OAuth2 / API integration.
 *
 * The authorization URL builder is fully implemented.
 * Token exchange and data fetching functions are scaffolded with TODO comments
 * because they require a Xero developer account and sandbox to test.
 *
 * Xero OAuth2 docs:
 *   https://developer.xero.com/documentation/guides/oauth2/auth-flow
 */

const XERO_AUTH_BASE = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';

/**
 * Builds the Xero OAuth2 authorization URL.
 *
 * Requires `XERO_CLIENT_ID` to be set in environment variables.
 * Scopes requested: openid profile email accounting.transactions.read (read access to invoices)
 *
 * @param redirectUri - The callback URL registered with Xero (e.g., /api/integrations/xero/callback)
 * @returns The full authorization URL to redirect the user to
 */
export function getXeroAuthUrl(redirectUri: string): string {
  const clientId = process.env.XERO_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'XERO_CLIENT_ID environment variable is not set. ' +
        'Register a Xero app at https://developer.xero.com to obtain credentials.'
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email accounting.transactions.read',
    state: crypto.randomUUID(),
  });

  return `${XERO_AUTH_BASE}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 *
 * TODO: Implement this function once you have a Xero developer account.
 *
 * Implementation steps:
 * 1. POST to XERO_TOKEN_URL with grant_type=authorization_code
 * 2. Include Authorization header: Basic base64(client_id:client_secret)
 * 3. Send code and redirect_uri in the request body
 * 4. Parse response for access_token, refresh_token, expires_in
 * 5. Fetch tenant connections from https://api.xero.com/connections to get tenant_id
 *
 * @param code - The authorization code from the OAuth callback
 * @param redirectUri - The same redirect URI used in the authorization request
 * @returns Token response with access_token, refresh_token, expires_in, and tenant_id
 */
export async function exchangeXeroCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number; tenant_id: string }> {
  // TODO: Implement Xero token exchange.
  // Requires XERO_CLIENT_ID and XERO_CLIENT_SECRET env vars.
  //
  // Example implementation:
  //
  // const clientId = process.env.XERO_CLIENT_ID!;
  // const clientSecret = process.env.XERO_CLIENT_SECRET!;
  // const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  //
  // const tokenResponse = await fetch(XERO_TOKEN_URL, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Basic ${basicAuth}`,
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //   },
  //   body: new URLSearchParams({
  //     grant_type: 'authorization_code',
  //     code,
  //     redirect_uri: redirectUri,
  //   }),
  // });
  //
  // if (!tokenResponse.ok) {
  //   const errorBody = await tokenResponse.text();
  //   throw new Error(`Xero token exchange failed: ${tokenResponse.status} ${errorBody}`);
  // }
  //
  // const tokenData = await tokenResponse.json();
  //
  // // Fetch tenant (organization) connections
  // const connectionsResponse = await fetch('https://api.xero.com/connections', {
  //   headers: {
  //     'Authorization': `Bearer ${tokenData.access_token}`,
  //     'Content-Type': 'application/json',
  //   },
  // });
  //
  // const connections = await connectionsResponse.json();
  // const tenantId = connections[0]?.tenantId ?? '';
  //
  // return {
  //   access_token: tokenData.access_token,
  //   refresh_token: tokenData.refresh_token,
  //   expires_in: tokenData.expires_in,
  //   tenant_id: tenantId,
  // };

  throw new Error(
    'Xero API integration not yet configured. ' +
      'Set up a Xero developer account at https://developer.xero.com and implement the token exchange in lib/integrations/xero.ts.'
  );
}

/**
 * Fetches invoices from the Xero API for a given organization.
 *
 * TODO: Implement this function once you have valid Xero API credentials.
 *
 * Implementation steps:
 * 1. GET /api.xro/2.0/Invoices with appropriate query params
 * 2. Include Authorization: Bearer {accessToken}
 * 3. Include Xero-Tenant-Id header with the tenant ID
 * 4. Parse the Invoices array from the response
 * 5. Return the array of invoice objects
 *
 * @param accessToken - A valid Xero OAuth2 access token
 * @param tenantId - The Xero organization (tenant) ID
 * @returns Array of Xero invoice objects
 */
export async function fetchXeroInvoices(
  accessToken: string,
  tenantId: string
): Promise<any[]> {
  // TODO: Implement Xero invoice fetching.
  //
  // Example implementation:
  //
  // const url = `${XERO_API_BASE}/Invoices?where=Type=="ACCREC"&order=Date DESC&page=1`;
  //
  // const response = await fetch(url, {
  //   headers: {
  //     'Authorization': `Bearer ${accessToken}`,
  //     'Xero-Tenant-Id': tenantId,
  //     'Accept': 'application/json',
  //   },
  // });
  //
  // if (!response.ok) {
  //   const errorBody = await response.text();
  //   throw new Error(`Xero invoice fetch failed: ${response.status} ${errorBody}`);
  // }
  //
  // const data = await response.json();
  // return data.Invoices ?? [];

  throw new Error(
    'Xero API integration not yet configured. ' +
      'Set up a Xero developer account at https://developer.xero.com and implement invoice fetching in lib/integrations/xero.ts.'
  );
}
