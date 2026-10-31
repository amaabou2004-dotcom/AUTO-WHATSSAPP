import { dispatchJob } from './dispatch.js';
import type { Env, Job, MessageBatch } from './types.js';

/** Handlers enregistrés — branchés au fil des phases suivantes. */
const handlers: Record<string, (job: Job) => Promise<void>> = {};

export default {
  /**
   * Consommateur de file.
   *
   * Règle : un message acquitté ne doit jamais être perdu ; un message inconnu
   * est acquitté avec une alerte (pas de boucle infinie) ; une erreur métier
   * transitoire déclenche un retry avec délai.
   */
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const result = await dispatchJob(message.body, handlers);
        if (result.status === 'unknown_type') {
          console.warn(
            JSON.stringify({
              level: 'warn',
              type: 'job_unknown_type',
              queue: batch.queue,
              job_type: result.reason,
              job_id: message.id,
            }),
          );
        }
        message.ack();
      } catch (error) {
        console.error(
          JSON.stringify({
            level: 'error',
            type: 'job_failed',
            queue: batch.queue,
            job_id: message.id,
            environment: env.ENVIRONMENT ?? 'development',
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        message.retry({ delaySeconds: 60 });
      }
    }
  },

  /**
   * Cron : filet de sécurité (reprise des travaux bloqués, agrégations,
   * purge de rétention). Rien n'est planifié avant que les tables existent.
   */
  async scheduled(controller: { cron: string }, env: Env): Promise<void> {
    console.warn(
      JSON.stringify({
        level: 'info',
        type: 'cron_tick',
        cron: controller.cron,
        environment: env.ENVIRONMENT ?? 'development',
        registered_handlers: Object.keys(handlers).length,
      }),
    );
  },
} satisfies ExportedHandler<Env>;
