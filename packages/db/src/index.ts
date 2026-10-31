/**
 * `@whatsauto/db` — accès PostgreSQL et migrations.
 * L'entrée principale est sûre côté Worker (aucun import Node).
 */
export {
  runMigrations,
  type Migration,
  type MigrationResult,
  type SqlExecutor,
} from './migrate.js';
