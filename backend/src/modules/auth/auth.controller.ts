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

export const registerHandler = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  sendSuccess(res, { user: toPublicUser(user) }, 201);
});

export const loginHandler = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.login(req.body, requestMeta(req));
  setRefreshCookie(res, tokens);
  sendSuccess(res, { user: toPublicUser(user), accessToken: tokens.accessToken });
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  if (!rawToken) {
    throw AppError.unauthorized('Missing refresh token');
  }

  const { user, tokens } = await authService.refresh(rawToken, requestMeta(req));
  setRefreshCookie(res, tokens);
  sendSuccess(res, { user: toPublicUser(user), accessToken: tokens.accessToken });
});

export const logoutHandler = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
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

export const meHandler = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  sendSuccess(res, { user: toPublicUser(user) });
});
