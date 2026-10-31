/**
 * Types minimaux des bindings du Worker de traitement.
 * Complétés en Phase 7 (base de données) et Phase 8 (Meta).
 */

export interface JobMessage<T = unknown> {
  readonly id: string;
  readonly timestamp: Date;
  readonly body: T;
  readonly attempts?: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

export interface MessageBatch<T = unknown> {
  readonly queue: string;
  readonly messages: readonly JobMessage<T>[];
}

export interface Env {
  readonly ENVIRONMENT?: string;
  readonly APP_VERSION?: string;
  readonly JOBS_QUEUE?: Queue;
  readonly DATABASE_URL?: string;
}

/** Un travail doit TOUJOURS être identifiable pour être idempotent. */
export interface Job<TPayload = unknown> {
  readonly type: string;
  readonly idempotency_key: string;
  readonly organization_id?: string;
  readonly payload: TPayload;
}
