import { z } from 'zod';

/**
 * Codes d'erreur publics — DOIT rester synchronisé avec `@whatsauto/core`.
 * Un test d'intégration vérifie l'égalité des deux listes.
 */
export const publicErrorCodes = [
  'bad_request',
  'validation_failed',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'version_conflict',
  'rate_limited',
  'quota_exceeded',
  'plan_required',
  'window_closed',
  'consent_required',
  'opted_out',
  'template_not_approved',
  'whatsapp_unavailable',
  'ai_unavailable',
  'out_of_scope',
  'internal_error',
] as const;

export const errorCodeSchema = z.enum(publicErrorCodes);

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    request_id: z.string().min(1),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
