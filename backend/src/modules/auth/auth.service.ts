import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { generateOpaqueToken, hashToken } from '../../utils/token';
import { parseDurationMs } from '../../utils/duration';
import { env } from '../../config/env';
import { SALT_ROUNDS, MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS, RESET_TOKEN_TTL_MS } from '../../config/constants';
import { User, type UserDoc } from '../users/user.model';
import type { Role } from '../../config/roles';
import { RefreshToken } from './refreshToken.model';
import { PasswordResetToken } from './passwordResetToken.model';
import { signAccessToken } from './jwt';
import { notificationService } from '../../services/notification.service';
import type { RegisterInput, LoginInput } from './auth.validation';

export interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

async function issueTokens(user: UserDoc, meta: RequestMeta): Promise<IssuedTokens> {
  const accessToken = signAccessToken({ sub: user._id.toString(), roles: user.roles as Role[] });

  const rawRefreshToken = generateOpaqueToken();
  const refreshExpiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshExpiresAt,
    userAgent: meta.userAgent ?? null,
    ip: meta.ip ?? null,
  });

  return { accessToken, refreshToken: rawRefreshToken, refreshExpiresAt };
}

export async function register(input: RegisterInput): Promise<UserDoc> {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw AppError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return User.create({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    phone: input.phone,
    roles: ['patient'],
  });
}

export async function login(input: LoginInput, meta: RequestMeta): Promise<{ user: UserDoc; tokens: IssuedTokens }> {
  const user = await User.findOne({ email: input.email });
  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  if (user.status === 'locked' && user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Account temporarily locked due to repeated failed attempts');
  }

  if (user.status === 'suspended') {
    throw AppError.forbidden('This account has been suspended');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.status = 'locked';
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();
    throw AppError.unauthorized('Invalid email or password');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  if (user.status === 'locked') {
    user.status = 'active';
  }
  await user.save();

  const tokens = await issueTokens(user, meta);
  return { user, tokens };
}

export async function refresh(
  rawRefreshToken: string,
  meta: RequestMeta,
): Promise<{ user: UserDoc; tokens: IssuedTokens }> {
  const tokenHash = hashToken(rawRefreshToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored) {
    throw AppError.unauthorized('Invalid refresh token');
  }

  if (stored.revokedAt) {
    // Reuse of a rotated-out token: treat as a compromised session and revoke everything.
    await RefreshToken.updateMany({ userId: stored.userId, revokedAt: null }, { revokedAt: new Date() });
    throw AppError.unauthorized('Refresh token has already been used');
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    throw AppError.unauthorized('Refresh token has expired');
  }

  const user = await User.findById(stored.userId);
  if (!user || user.status !== 'active') {
    throw AppError.unauthorized('Account is not active');
  }

  const tokens = await issueTokens(user, meta);
  stored.revokedAt = new Date();
  stored.replacedByHash = hashToken(tokens.refreshToken);
  await stored.save();

  return { user, tokens };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user) {
    return;
  }

  const rawToken = generateOpaqueToken();
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  await notificationService.sendPasswordResetEmail(user.email, rawToken);
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const resetToken = await PasswordResetToken.findOne({ tokenHash, usedAt: null });

  if (!resetToken || resetToken.expiresAt.getTime() < Date.now()) {
    throw AppError.badRequest('Invalid or expired reset token');
  }

  const user = await User.findById(resetToken.userId);
  if (!user) {
    throw AppError.badRequest('Invalid or expired reset token');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordChangedAt = new Date();
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.status = 'active';
  await user.save();

  resetToken.usedAt = new Date();
  await resetToken.save();

  await RefreshToken.updateMany({ userId: user._id as Types.ObjectId, revokedAt: null }, { revokedAt: new Date() });
}
