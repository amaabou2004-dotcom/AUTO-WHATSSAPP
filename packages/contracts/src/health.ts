import { z } from 'zod';

export const healthStatusSchema = z.enum(['ok', 'degraded', 'down']);

export const healthCheckSchema = z.object({
  status: healthStatusSchema,
  latency_ms: z.number().int().nonnegative().optional(),
});

export const healthResponseSchema = z.object({
  status: healthStatusSchema,
  version: z.string(),
  checks: z.record(z.string(), healthCheckSchema),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
