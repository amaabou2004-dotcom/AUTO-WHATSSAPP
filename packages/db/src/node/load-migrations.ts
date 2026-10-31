/**
 * Chargement des migrations depuis le système de fichiers (CLI uniquement).
 * Volontairement isolé de `@whatsauto/db` pour que le Worker n'importe jamais `node:fs`.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Migration } from '../migrate.js';

export async function loadMigrationsFromDir(dir: string): Promise<Migration[]> {
  const entries = await readdir(dir);
  const files = entries.filter((name) => name.endsWith('.sql')).sort();

  const migrations: Migration[] = [];
  for (const file of files) {
    const id = file.replace(/\.sql$/, '');
    const sql = await readFile(join(dir, file), 'utf8');
    migrations.push({ id, sql });
  }
  return migrations;
}
