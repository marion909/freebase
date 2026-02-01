import { z } from 'zod';

// Slug validation schema
export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
  .min(3, 'Slug must be at least 3 characters')
  .max(63, 'Slug must be at most 63 characters');

export type Slug = z.infer<typeof SlugSchema>;

// Email validation
export const EmailSchema = z.string().email('Invalid email address');

// Password validation
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

// Domain validation
export const DomainNameSchema = z.string().refine((val) => {
  try {
    new URL(`https://${val}`);
    return true;
  } catch {
    return false;
  }
}, 'Invalid domain name');
