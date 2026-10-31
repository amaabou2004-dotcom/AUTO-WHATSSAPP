/**
 * CLI de migration : applique les fichiers SQL de `migrations/` sur la base cible.
 *
 * Usage :
 *   DATABASE_URL_SERVICE=postgres://... node dist/node/migrate-cli.js [dossier]
 *
 * Sécurité :
 *  - refuse de s'exécuter sans chaîne de connexion ;
 *  - n'affiche jamais la chaîne de connexion (elle contient un mot de passe) ;
 *  - s'arrête à la première migration en échec (transaction annulée).
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import postgres from 'postgres';

import { runMigrations, type SqlExecutor } from '../migrate.js';
import { loadMigrationsFromDir } from './load-migrations.js';

const here = dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = resolve(here, '../../migrations');

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL_SERVICE ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      'Chaîne de connexion absente. Définir DATABASE_URL_SERVICE (migrations) ou DATABASE_URL.',
    );
    process.exit(1);
  }

  const migrationsDir = process.argv[2] ?? defaultMigrationsDir;
  const migrations = await loadMigrationsFromDir(migrationsDir);
  if (migrations.length === 0) {
    console.error(`Aucune migration trouvée dans ${migrationsDir}`);
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1, onnotice: () => {} });

  const executor: SqlExecutor = {
    async exec(statement: string): Promise<void> {
      await sql.unsafe(statement);
    },
    async query<T = Record<string, unknown>>(
      statement: string,
      params?: readonly unknown[],
    ): Promise<T[]> {
      // `postgres.js` type les paramètres par générique ; notre exécuteur reste
      // agnostique du driver, d'où la conversion explicite en `never[]`.
      const values = (params ? [...params] : []) as never[];
      const rows = await sql.unsafe(statement, values);
      return rows as unknown as T[];
    },
  };

  console.warn(`Application de ${migrations.length} migration(s) depuis ${join(migrationsDir)}`);

  try {
    const result = await runMigrations(executor, migrations);
    console.warn(`Migrations appliquées : ${result.applied.length}`);
    for (const id of result.applied) console.warn(`  + ${id}`);
    console.warn(`Déjà appliquées    : ${result.skipped.length}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error('Échec des migrations :', error instanceof Error ? error.message : error);
  process.exit(1);
});
