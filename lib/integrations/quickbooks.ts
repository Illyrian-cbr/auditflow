/**
 * QuickBooks Online OAuth2 / API integration.
 *
 * The authorization URL builder is fully implemented.
 * Token exchange and data fetching functions are scaffolded with TODO comments
 * because they require a QuickBooks developer account and sandbox to test.
 *
 * QuickBooks OAuth2 docs:
 *   https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
 */

const QB_AUTH_BASE = 'https://appcenter.intuit.com/connect/oauth2';
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QB_API_BASE = 'https://quickbooks.api.intuit.com/v3';

/**
 * Builds the QuickBooks OAuth2 authorization URL.
 *
 * Requires `QUICKBOOKS_CLIENT_ID` to be set in environment variables.
 * Scopes requested: com.intuit.quickbooks.accounting (read access to invoices, etc.)
 *
 * @param redirectUri - The callback URL registered with QuickBooks (e.g., /api/integrations/quickbooks/callback)
 * @returns The full authorization URL to redirect the user to
 */
export function getQuickBooksAuthUrl(redirectUri: string): string {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'QUICKBOOKS_CLIENT_ID environment variable is not set. ' +
        'Register a QuickBooks app at https://developer.intuit.com to obtain credentials.'
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state: crypto.randomUUID(),
  });

  return `${QB_AUTH_BASE}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 *
 * TODO: Implement this function once you have a QuickBooks developer account.
 *
 * Implementation steps:
 * 1. POST to QB_TOKEN_URL with grant_type=authorization_code
 * 2. Include Authorization header: Basic base64(client_id:client_secret)
 * 3. Send code and redirect_uri in the request body
 * 4. Parse response for access_token, refresh_token, expires_in
 * 5. Return tokens along with the realm_id from the original callback
 *
 * @param code - The authorization code from the OAuth callback
 * @param redirectUri - The same redirect URI used in the authorization request
 * @returns Token response with access_token, refresh_token, expires_in, and realm_id
 */
export async function exchangeQuickBooksCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number; realm_id: string }> {
  // TODO: Implement QuickBooks token exchange.
  // Requires QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET env vars.
  //
  // Example implementation:
  //
  // const clientId = process.env.QUICKBOOKS_CLIENT_ID!;
  // const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!;
  // const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  //
  // const response = await fetch(QB_TOKEN_URL, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Basic ${basicAuth}`,
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //     'Accept': 'application/json',
  //   },
  //   body: new URLSearchParams({
  //     grant_type: 'authorization_code',
  //     code,
  //     redirect_uri: redirectUri,
  //   }),
  // });
  //
  // if (!response.ok) {
  //   const errorBody = await response.text();
  //   throw new Error(`QuickBooks token exchange failed: ${response.status} ${errorBody}`);
  // }
  //
  // const data = await response.json();
  // return {
  //   access_token: data.access_token,
  //   refresh_token: data.refresh_token,
  //   expires_in: data.expires_in,
  //   realm_id: '', // passed from callback query params, not from token response
  // };

  throw new Error(
    'QuickBooks API integration not yet configured. ' +
      'Set up a QuickBooks developer account at https://developer.intuit.com and implement the token exchange in lib/integrations/quickbooks.ts.'
  );
}

/**
 * Fetches invoices from the QuickBooks API for a given company.
 *
 * TODO: Implement this function once you have valid QuickBooks API credentials.
 *
 * Implementation steps:
 * 1. GET /v3/company/{realmId}/query?query=SELECT * FROM Invoice MAXRESULTS 100
 * 2. Include Authorization: Bearer {accessToken}
 * 3. Parse the QueryResponse.Invoice array
 * 4. Return the array of invoice objects
 *
 * @param accessToken - A valid QuickBooks OAuth2 access token
 * @param realmId - The QuickBooks company ID (realm ID)
 * @returns Array of QuickBooks invoice objects
 */
export async function fetchQuickBooksInvoices(
  accessToken: string,
  realmId: string
): Promise<any[]> {
  // TODO: Implement QuickBooks invoice fetching.
  //
  // Example implementation:
  //
  // const query = encodeURIComponent('SELECT * FROM Invoice MAXRESULTS 100');
  // const url = `${QB_API_BASE}/company/${realmId}/query?query=${query}`;
  //
  // const response = await fetch(url, {
  //   headers: {
  //     'Authorization': `Bearer ${accessToken}`,
  //     'Accept': 'application/json',
  //   },
  // });
  //
  // if (!response.ok) {
  //   const errorBody = await response.text();
  //   throw new Error(`QuickBooks invoice fetch failed: ${response.status} ${errorBody}`);
  // }
  //
  // const data = await response.json();
  // return data.QueryResponse?.Invoice ?? [];

  throw new Error(
    'QuickBooks API integration not yet configured. ' +
      'Set up a QuickBooks developer account at https://developer.intuit.com and implement invoice fetching in lib/integrations/quickbooks.ts.'
  );
}
