import { z } from 'zod';

export const ResourceUsageSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  storageBytes: z.number().int().nonnegative(),
  updatedAt: z.date(),
});

export type ResourceUsage = z.infer<typeof ResourceUsageSchema>;

export const ResourceUsageResponseSchema = z.object({
  storageBytes: z.number(),
  storageGb: z.number(),
  limitGb: z.number().default(1),
  percentageUsed: z.number(),
  status: z.enum(['ok', 'warning', 'exceeded']),
});

export type ResourceUsageResponse = z.infer<typeof ResourceUsageResponseSchema>;
