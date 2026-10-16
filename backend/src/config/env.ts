import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default('/api/v1'),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Google OAuth ("Continue with Google"). Optional at the schema level so the app still boots
  // without them in an environment that doesn't need Google sign-in (e.g. a CI test run); the
  // /auth/google routes themselves fail fast with a clear error if these are unset at request time.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // The backend's own callback URL, registered in Google Cloud Console's "Authorized redirect URIs".
  GOOGLE_REDIRECT_URI: z.string().optional(),
  // Custom URL scheme the mobile app registers for deep-link callbacks (mediconnect://auth/callback).
  MOBILE_OAUTH_SCHEME: z.string().default('mediconnect'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().default('./storage'),
  STORAGE_PRIVATE_ROOT: z.string().default('./storage/private'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(5),

  // Required only when STORAGE_DRIVER=s3; validated at adapter construction time (see
  // storage/s3.storage.ts) rather than here, so the app still boots without them when using the
  // local driver.
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  // Only needed for an S3-compatible provider that isn't AWS itself (e.g. Cloudflare R2,
  // Backblaze B2, MinIO) — leave unset for real AWS S3.
  AWS_S3_ENDPOINT: z.string().optional(),
  AWS_S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
