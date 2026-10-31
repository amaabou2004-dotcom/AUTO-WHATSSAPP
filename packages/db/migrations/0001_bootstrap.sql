-- 0001_bootstrap.sql
-- Schéma applicatif et primitives d'isolation multi-tenant.
-- Portable : ne dépend d'aucune extension Supabase et s'exécute sous PGlite (tests).

create schema if not exists app;

comment on schema app is
  'Primitives applicatives : contexte de tenant, horodatage, helpers.';

-- ---------------------------------------------------------------------------
-- Trigger générique de mise à jour de updated_at.
-- ---------------------------------------------------------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function app.set_updated_at() is
  'À attacher aux tables possédant une colonne updated_at.';

-- ---------------------------------------------------------------------------
-- Contexte d'isolation multi-tenant.
--
-- L'organisation courante provient exclusivement du JWT signé par le serveur
-- (auth Supabase), jamais d'un en-tête ou d'un paramètre contrôlé par le client.
-- Le Worker positionne la revendication via set_config() pour les connexions
-- au nom d'un utilisateur ; les connexions service n'ont pas de contexte et
-- n'accèdent donc à aucune donnée filtrée par ces helper.
-- ---------------------------------------------------------------------------
create or replace function app.current_organization_id()
returns uuid
language sql
stable
as $$
  select nullif(
           current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id',
           ''
         )::uuid;
$$;

comment on function app.current_organization_id() is
  'Organisation du JWT courant ; NULL si aucun contexte (service, anonyme).';

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;

create or replace function app.current_role()
returns text
language sql
stable
as $$
  select current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role';
$$;

-- ---------------------------------------------------------------------------
-- Journal des migrations appliquées (créé par le runner, mais documenté ici).
-- ---------------------------------------------------------------------------
comment on schema app is
  'Primitives applicatives : contexte de tenant, horodatage, helpers. Table de suivi : app.schema_migrations.';
