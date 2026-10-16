import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { env } from '../../config/env';
import { REFRESH_TOKEN_COOKIE_NAME } from '../../config/constants';
import { toPublicUser } from '../users/user.mapper';
import { User } from '../users/user.model';
import * as authService from './auth.service';
import type { IssuedTokens } from './auth.service';
import { buildGoogleAuthUrl, exchangeGoogleCode, isValidPlatform, type OAuthPlatform } from './google';

const REFRESH_COOKIE_PATH = `${env.API_PREFIX}/auth`;

function setRefreshCookie(res: Response, tokens: IssuedTokens) {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    expires: tokens.refreshExpiresAt,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

function requestMeta(req: Request) {
  const userAgent = req.headers['user-agent'];
  return { userAgent: typeof userAgent === 'string' ? userAgent : undefined, ip: req.ip };
}

/**
 * The website never needs the raw refresh token outside the HttpOnly cookie — handing it to JS
 * would undo the whole point of HttpOnly (keeping it out of reach of an XSS payload). A native
 * mobile app has no browser cookie jar at all, so it has no other way to obtain or resend one.
 * `X-Client-Platform: mobile` is this API's explicit opt-in for that different, documented need —
 * never inferred from User-Agent, which a browser can trivially spoof and a mobile client might
 * configure however it likes.
 */
function isMobileClient(req: Request): boolean {
  return req.headers['x-client-platform'] === 'mobile';
}

function readRefreshToken(req: Request): string | undefined {
  return req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] ?? (typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined);
}

export const registerHandler = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  sendSuccess(res, { user: toPublicUser(user) }, 201);
});

export const loginHandler = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.login(req.body, requestMeta(req));
  setRefreshCookie(res, tokens);
  const mobile = isMobileClient(req);
  sendSuccess(res, {
    user: toPublicUser(user),
    accessToken: tokens.accessToken,
    ...(mobile ? { refreshToken: tokens.refreshToken } : {}),
  });
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const rawToken = readRefreshToken(req);
  if (!rawToken) {
    throw AppError.unauthorized('Missing refresh token');
  }

  const { user, tokens } = await authService.refresh(rawToken, requestMeta(req));
  setRefreshCookie(res, tokens);
  const mobile = isMobileClient(req);
  sendSuccess(res, {
    user: toPublicUser(user),
    accessToken: tokens.accessToken,
    ...(mobile ? { refreshToken: tokens.refreshToken } : {}),
  });
});

export const logoutHandler = asyncHandler(async (req, res) => {
  const rawToken = readRefreshToken(req);
  if (rawToken) {
    await authService.logout(rawToken);
  }
  clearRefreshCookie(res);
  sendSuccess(res, { loggedOut: true });
});

export const forgotPasswordHandler = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, { message: 'If an account with that email exists, a reset link has been sent' });
});

export const resetPasswordHandler = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  sendSuccess(res, { message: 'Password updated successfully' });
});

export const googleStartHandler = asyncHandler(async (req, res) => {
  const platform: OAuthPlatform = isValidPlatform(req.query.platform) ? req.query.platform : 'web';
  res.redirect(buildGoogleAuthUrl(platform));
});

/**
 * Google redirects the user's browser here directly (not an XHR a frontend can read the response
 * of), so every outcome — success or failure — has to be a redirect, never a JSON error response:
 * a web client's AuthProvider picks the session up from the HttpOnly cookie on its next mount (the
 * same restoreSession() every page load already runs), while a native app has no cookie jar at all
 * and gets its tokens the only way a browser redirect can hand data to it — a custom-scheme deep
 * link query string, mirroring the body-token fallback /auth/login already offers mobile.
 */
export const googleCallbackHandler = asyncHandler(async (req, res) => {
  const platform: OAuthPlatform = isValidPlatform(req.query.state) ? req.query.state : 'web';
  const redirectOnError = (reason: string) =>
    platform === 'mobile'
      ? res.redirect(`${env.MOBILE_OAUTH_SCHEME}://auth/callback?error=${encodeURIComponent(reason)}`)
      : res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(reason)}`);

  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  if (!code) {
    redirectOnError('google_auth_cancelled');
    return;
  }

  let result;
  try {
    const profile = await exchangeGoogleCode(code);
    result = await authService.loginWithGoogleProfile(profile, requestMeta(req));
  } catch (err) {
    redirectOnError(err instanceof AppError ? err.message : 'google_auth_failed');
    return;
  }

  const { tokens } = result;
  if (platform === 'mobile') {
    const params = new URLSearchParams({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    res.redirect(`${env.MOBILE_OAUTH_SCHEME}://auth/callback?${params.toString()}`);
    return;
  }

  setRefreshCookie(res, tokens);
  res.redirect(`${env.FRONTEND_URL}/account`);
});

export const meHandler = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  sendSuccess(res, { user: toPublicUser(user) });
});
