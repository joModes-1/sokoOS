import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const ugandaPhoneSchema = z
  .string()
  .regex(/^\+256[0-9]{9}$|^07[0-9]{8}$/, 'Enter a valid Uganda phone number (+256... or 07...)')
  .transform(p => p.startsWith('07') ? '+256' + p.slice(1) : p);

export const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(100),
  email: z.string().email('Valid email required').toLowerCase(),
  phone: ugandaPhoneSchema,
  password: passwordSchema,
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

export const MfaChallengeSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().length(6, '6-digit code required').or(z.string().min(16).max(32)), // TOTP or recovery
});

export const VerifyPhoneSchema = z.object({
  code: z.string().length(6, '6-digit code required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const RegisterBusinessSchema = z.object({
  businessName: z.string().min(2, 'Business name required').max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug: lowercase letters, numbers and hyphens only').optional(),
  businessType: z.enum([
    'RETAIL', 'PHARMACY', 'RESTAURANT', 'WHOLESALE', 'DISTRIBUTION',
    'MANUFACTURING', 'AGRICULTURE', 'HOSPITALITY', 'AUTOMOTIVE', 'CONSTRUCTION',
    'BEAUTY', 'EDUCATION', 'SERVICES', 'FUEL_STATION', 'LOGISTICS',
    'LAUNDRY', 'LABORATORY', 'REAL_ESTATE', 'ELECTRONICS_REPAIR', 'OTHER',
  ]),
  businessSize: z.enum(['MICRO', 'SMALL', 'GROWING', 'ESTABLISHED', 'ENTERPRISE']).optional(),
  tin: z.string().max(20).optional(),
  phone: ugandaPhoneSchema.optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
  }).optional(),
  branchName: z.string().min(1, 'Branch name required').max(100).default('Main Branch'),
  branchCode: z.string().min(1).max(20).default('BR-01'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterBusinessInput = z.infer<typeof RegisterBusinessSchema>;
