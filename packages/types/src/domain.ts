import { z } from 'zod';

export const DomainSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  domain: z.string().refine((val) => {
    try {
      new URL(`https://${val}`);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid domain'),
  isCustom: z.boolean(),
  dnsVerified: z.boolean(),
  dnsToken: z.string().optional().nullable(),
  sslCertExpiry: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Domain = z.infer<typeof DomainSchema>;

export const CreateDomainSchema = z.object({
  domain: z.string().refine((val) => {
    try {
      new URL(`https://${val}`);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid domain'),
});

export type CreateDomain = z.infer<typeof CreateDomainSchema>;
