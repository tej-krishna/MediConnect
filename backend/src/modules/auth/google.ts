import { AppError } from '../../utils/AppError';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export type OAuthPlatform = 'web' | 'mobile';

function requireGoogleConfig() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw AppError.badRequest('Google sign-in is not configured on this server');
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  };
}

/** `state` carries only which platform started the flow — read back on the callback to decide
 * where to redirect afterward (an HttpOnly cookie for web, a deep link for mobile). It isn't a
 * secret and isn't trusted for anything beyond that choice of redirect target. */
export function buildGoogleAuthUrl(platform: OAuthPlatform): string {
  const { clientId, redirectUri } = requireGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: platform,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

export async function exchangeGoogleCode(code: string): Promise<{ googleId: string; email: string; emailVerified: boolean; fullName: string }> {
  const { clientId, clientSecret, redirectUri } = requireGoogleConfig();

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenRes.ok) {
    // Google's own error body (e.g. {"error":"redirect_uri_mismatch"} or {"error":"invalid_client"})
    // is the one piece of information that actually explains a misconfigured client — surfacing
    // only "Failed to exchange..." to the end user is correct, but logging the real reason here is
    // the difference between a one-line env/console fix and an unexplained bounce back to /login.
    const body = await tokenRes.text().catch(() => '<unreadable body>');
    logger.error('Google token exchange failed', { status: tokenRes.status, body });
    throw AppError.unauthorized('Failed to exchange Google authorization code');
  }
  const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) {
    const body = await userRes.text().catch(() => '<unreadable body>');
    logger.error('Google userinfo fetch failed', { status: userRes.status, body });
    throw AppError.unauthorized('Failed to fetch Google profile');
  }
  const profile = (await userRes.json()) as GoogleUserInfo;

  if (!profile.email) {
    throw AppError.unauthorized('Google account has no email');
  }

  return {
    googleId: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified === true,
    fullName: profile.name && profile.name.trim() ? profile.name.trim() : profile.email.split('@')[0],
  };
}

export function isValidPlatform(value: unknown): value is OAuthPlatform {
  return value === 'web' || value === 'mobile';
}
