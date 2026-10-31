/**
 * Erreurs applicatives typées.
 *
 * Toute erreur destinée à un client passe par `AppError` : le code est stable,
 * documenté, et traduit côté interface. Aucun message interne (SQL, stack,
 * jeton) ne doit jamais atteindre le client.
 */

export const ERROR_CODES = [
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

export type ErrorCode = (typeof ERROR_CODES)[number];

const STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  bad_request: 400,
  validation_failed: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  version_conflict: 409,
  rate_limited: 429,
  quota_exceeded: 402,
  plan_required: 402,
  window_closed: 409,
  consent_required: 422,
  opted_out: 409,
  template_not_approved: 422,
  whatsapp_unavailable: 503,
  ai_unavailable: 503,
  out_of_scope: 200,
  internal_error: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    request_id: string;
  };
}

/**
 * Convertit n'importe quelle exception en enveloppe d'erreur publique.
 * Une erreur inconnue devient `internal_error` : le détail réel est journalisé,
 * jamais renvoyé.
 */
export function toErrorEnvelope(error: unknown, requestId: string): ErrorEnvelope {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        request_id: requestId,
      },
    };
  }
  return {
    error: {
      code: 'internal_error',
      message: 'Une erreur inattendue est survenue.',
      request_id: requestId,
    },
  };
}

export function statusForError(error: unknown): number {
  return error instanceof AppError ? error.status : 500;
}
