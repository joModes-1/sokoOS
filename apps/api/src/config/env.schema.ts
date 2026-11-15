import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  MTN_MOMO_BASE_URL: z.string().url().optional(),
  MTN_MOMO_SUBSCRIPTION_KEY: z.string().optional(),
  MTN_MOMO_API_USER: z.string().optional(),
  MTN_MOMO_API_KEY: z.string().optional(),
  MTN_MOMO_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  AIRTEL_MONEY_BASE_URL: z.string().url().optional(),
  AIRTEL_MONEY_CLIENT_ID: z.string().optional(),
  AIRTEL_MONEY_CLIENT_SECRET: z.string().optional(),
  AIRTEL_MONEY_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  STORAGE_ENDPOINT: z.string().url().optional(),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET: z.string().default('sokoos-uploads'),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().url().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('SokoOS <no-reply@localhost>'),
  SUPPORT_EMAIL: z.string().email().optional(),

  SMS_PROVIDER: z.enum(['mock', 'africas_talking', 'twilio']).default('mock'),
  WHATSAPP_PROVIDER: z.enum(['mock', 'meta']).default('mock'),
})
  .superRefine((env, ctx) => {
    // FRONTEND_URL accepts one origin or a comma-separated allow-list (matches main.ts CORS).
    const frontendOrigins = env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean);
    const invalidOrigin = frontendOrigins.find((s) => {
      try { return !new URL(s) && false; } catch { return true; }
    });
    if (invalidOrigin) {
      ctx.addIssue({
        code: 'custom',
        path: ['FRONTEND_URL'],
        message: `FRONTEND_URL must be one or more comma-separated URLs (invalid: ${invalidOrigin})`,
      });
    }
    if (env.NODE_ENV !== 'production') return;
    if (frontendOrigins.length > 0 && frontendOrigins.every((s) => s.includes('localhost'))) {
      ctx.addIssue({
        code: 'custom',
        path: ['FRONTEND_URL'],
        message: 'FRONTEND_URL must include the deployed web origin in production (CORS is locked to it)',
      });
    }
    for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET'] as const) {
      if (env[key].includes('change-me')) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} still holds the example value — generate a real secret for production`,
        });
      }
    }
  });

export default envSchema;
export type Env = z.infer<typeof envSchema>;
