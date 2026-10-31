import { readFileSync } from 'node:fs';

import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations, type Migration, type SqlExecutor } from '../src/migrate.js';

/**
 * La migration réelle du dépôt est testée telle quelle (et non une copie) :
 * c'est elle qui sera appliquée en production.
 */
const REAL_BOOTSTRAP: Migration = {
  id: '0001_bootstrap',
  sql: readFileSync(new URL('../migrations/0001_bootstrap.sql', import.meta.url), 'utf8'),
};

function executorOf(db: PGlite): SqlExecutor {
  return {
    async exec(sql: string): Promise<void> {
      await db.exec(sql);
    },
    async query<T = Record<string, unknown>>(
      sql: string,
      params?: readonly unknown[],
    ): Promise<T[]> {
      const result = await db.query<T>(sql, params ? [...params] : undefined);
      return result.rows;
    },
  };
}

const first: Migration = {
  id: '0001_bootstrap',
  sql: `
    create schema if not exists app;
    create or replace function app.set_updated_at() returns trigger language plpgsql as $$
    begin new.updated_at := now(); return new; end; $$;
  `,
};

const second: Migration = {
  id: '0002_example_table',
  sql: `
    create table public.example (
      id uuid primary key default gen_random_uuid(),
      organization_id uuid not null,
      name text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create trigger example_set_updated_at before update on public.example
      for each row execute function app.set_updated_at();
  `,
};

describe('runMigrations', () => {
  let db: PGlite;
  let executor: SqlExecutor;

  beforeEach(async () => {
    db = new PGlite();
    await db.waitReady;
    executor = executorOf(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it("applique les migrations dans l'ordre et les enregistre", async () => {
    const result = await runMigrations(executor, [first, second]);
    expect(result.applied).toEqual(['0001_bootstrap', '0002_example_table']);
    expect(result.skipped).toEqual([]);

    const rows = await executor.query<{ id: string }>(
      'select id from app.schema_migrations order by id',
    );
    expect(rows.map((row) => row.id)).toEqual(['0001_bootstrap', '0002_example_table']);
  });

  it('est idempotent : une seconde exécution ne réapplique rien', async () => {
    await runMigrations(executor, [first, second]);
    const secondRun = await runMigrations(executor, [first, second]);
    expect(secondRun.applied).toEqual([]);
    expect(secondRun.skipped).toEqual(['0001_bootstrap', '0002_example_table']);
  });

  it('applique seulement les migrations nouvelles', async () => {
    await runMigrations(executor, [first]);
    const third: Migration = {
      id: '0003_add_index',
      sql: 'create index example_name_idx on public.example (name);',
    };
    const result = await runMigrations(executor, [first, second, third]);
    expect(result.applied).toEqual(['0002_example_table', '0003_add_index']);
    expect(result.skipped).toEqual(['0001_bootstrap']);
  });

  it("annule une migration en échec et n'enregistre rien", async () => {
    const broken: Migration = { id: '0004_broken', sql: 'create table (' };
    await expect(runMigrations(executor, [first, broken])).rejects.toThrowError(/0004_broken/);

    const rows = await executor.query<{ id: string }>('select id from app.schema_migrations');
    expect(rows.map((row) => row.id)).toEqual(['0001_bootstrap']);
  });

  it('refuse des identifiants dupliqués', async () => {
    await expect(runMigrations(executor, [first, first])).rejects.toThrowError(/dupliqué/);
  });

  it('refuse des migrations non triées', async () => {
    await expect(runMigrations(executor, [second, first])).rejects.toThrowError(/non triées/);
  });

  it('refuse un identifiant mal formé', async () => {
    await expect(runMigrations(executor, [{ id: 'init', sql: 'select 1;' }])).rejects.toThrowError(
      /invalide/,
    );
  });

  it('refuse une migration vide', async () => {
    await expect(runMigrations(executor, [{ id: '0005_empty', sql: '   ' }])).rejects.toThrowError(
      /vide/,
    );
  });
});

describe('contexte multi-tenant (SQL) — migration réelle', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await db.waitReady;
    const result = await runMigrations(executorOf(db), [REAL_BOOTSTRAP]);
    expect(result.applied).toEqual(['0001_bootstrap']);
  });

  afterEach(async () => {
    await db.close();
  });

  it('retourne NULL sans jeton (aucun contexte => aucun accès)', async () => {
    const result = await db.query<{ organization_id: string | null }>(
      'select app.current_organization_id() as organization_id',
    );
    expect(result.rows[0]?.organization_id).toBeNull();
  });

  it("extrait l'organisation des revendications signées", async () => {
    const organizationId = '11111111-1111-4111-8111-111111111111';
    await db.exec(
      `select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","app_metadata":{"organization_id":"${organizationId}","role":"admin"}}', false);`,
    );

    const result = await db.query<{ organization_id: string; role: string; user_id: string }>(
      'select app.current_organization_id() as organization_id, app.current_role() as role, app.current_user_id() as user_id',
    );
    expect(result.rows[0]?.organization_id).toBe(organizationId);
    expect(result.rows[0]?.role).toBe('admin');
    expect(result.rows[0]?.user_id).toBe('22222222-2222-4222-8222-222222222222');
  });

  it("ignore une revendication absente sans lever d'erreur", async () => {
    await db.exec(`select set_config('request.jwt.claims', '{}', false);`);
    const result = await db.query<{ organization_id: string | null }>(
      'select app.current_organization_id() as organization_id',
    );
    expect(result.rows[0]?.organization_id).toBeNull();
  });
});
