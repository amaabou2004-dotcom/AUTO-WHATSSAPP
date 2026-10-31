/**
 * Runner de migrations portable.
 *
 * Il ne dépend d'aucun driver : l'appelant fournit un `SqlExecutor`.
 * - en production : `postgres.js` (voir `src/node`) ;
 * - en test : PGlite (Postgres compilé en WebAssembly), donc exécutable hors ligne.
 *
 * Règles :
 *  - une migration appliquée n'est JAMAIS réexécutée ni modifiée ;
 *  - les identifiants sont strictement croissants et uniques ;
 *  - une migration non appliquée s'exécute dans une transaction ; en cas d'échec,
 *    rien n'est enregistré et le runner s'arrête.
 */

export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>;
}

export interface Migration {
  /** Identifiant trié lexicographiquement, ex. `0001_bootstrap`. */
  readonly id: string;
  readonly sql: string;
}

export interface MigrationResult {
  readonly applied: readonly string[];
  readonly skipped: readonly string[];
}

const TRACKING_TABLE = 'app.schema_migrations';

function assertValidMigrations(migrations: readonly Migration[]): void {
  const seen = new Set<string>();
  let previous = '';
  for (const migration of migrations) {
    if (!/^[0-9]{4}_[a-z0-9_]+$/.test(migration.id)) {
      throw new Error(`Identifiant de migration invalide : ${migration.id}`);
    }
    if (seen.has(migration.id)) {
      throw new Error(`Identifiant de migration dupliqué : ${migration.id}`);
    }
    if (migration.id <= previous) {
      throw new Error(`Migrations non triées ou identifiant non croissant : ${migration.id}`);
    }
    if (migration.sql.trim().length === 0) {
      throw new Error(`Migration vide : ${migration.id}`);
    }
    seen.add(migration.id);
    previous = migration.id;
  }
}

async function ensureTrackingTable(db: SqlExecutor): Promise<void> {
  await db.exec('create schema if not exists app;');
  await db.exec(`
    create table if not exists ${TRACKING_TABLE} (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

export async function runMigrations(
  db: SqlExecutor,
  migrations: readonly Migration[],
): Promise<MigrationResult> {
  assertValidMigrations(migrations);
  await ensureTrackingTable(db);

  const rows = await db.query<{ id: string }>(`select id from ${TRACKING_TABLE}`);
  const appliedIds = new Set(rows.map((row) => row.id));

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      skipped.push(migration.id);
      continue;
    }

    await db.exec('begin;');
    try {
      await db.exec(migration.sql);
      await db.query(`insert into ${TRACKING_TABLE} (id) values ($1)`, [migration.id]);
      await db.exec('commit;');
    } catch (error) {
      await db.exec('rollback;');
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Échec de la migration ${migration.id} : ${reason}`);
    }

    applied.push(migration.id);
  }

  return { applied, skipped };
}
