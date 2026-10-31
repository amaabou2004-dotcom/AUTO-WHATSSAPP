import type { Job } from './types.js';

/**
 * Table de routage des travaux.
 *
 * Phase 3 : aucun handler métier n'existe encore, et c'est délibéré.
 * Un type de travail inconnu est **acquitté** (jamais renvoyé en boucle :
 * cela saturerait la file et masquerait l'erreur réelle) après une alerte.
 */
export type JobHandler = (job: Job) => Promise<void>;

export interface DispatchResult {
  readonly status: 'handled' | 'unknown_type' | 'invalid';
  readonly reason?: string;
}

export async function dispatchJob(
  job: unknown,
  handlers: Readonly<Record<string, JobHandler>>,
): Promise<DispatchResult> {
  if (!isJob(job)) {
    return { status: 'invalid', reason: 'job_shape' };
  }

  const handler = handlers[job.type];
  if (!handler) {
    return { status: 'unknown_type', reason: job.type };
  }

  await handler(job);
  return { status: 'handled' };
}

function isJob(value: unknown): value is Job {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Job>;
  return (
    typeof candidate.type === 'string' &&
    candidate.type.length > 0 &&
    typeof candidate.idempotency_key === 'string' &&
    candidate.idempotency_key.length > 0 &&
    'payload' in candidate
  );
}
