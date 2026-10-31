/**
 * Configuration runtime de l'API.
 * Toute valeur provient de l'environnement (secrets Workers / wrangler.toml).
 * Aucun secret n'est exposé au client : seules les valeurs marquées `public` sortent.
 */

export interface Env {
  readonly ENVIRONMENT?: string;
  readonly APP_VERSION?: string;
  readonly API_ALLOWED_ORIGINS?: string;
  readonly BRAND_NAME?: string;
  readonly BRAND_LOGO_URL?: string;
  readonly BRAND_PRIMARY_COLOR?: string;
  readonly ENABLED_LOCALES?: string;
}

export interface AppConfig {
  readonly environment: 'development' | 'staging' | 'production' | 'test';
  readonly version: string;
  readonly allowedOrigins: readonly string[];
  readonly brand: {
    readonly name: string;
    readonly logoUrl: string | null;
    readonly primaryColor: string;
  };
  readonly enabledLocales: readonly string[];
}

const ENVIRONMENTS = new Set(['development', 'staging', 'production', 'test']);

export function loadConfig(env: Env): AppConfig {
  const environment = ENVIRONMENTS.has(env.ENVIRONMENT ?? '')
    ? (env.ENVIRONMENT as AppConfig['environment'])
    : 'development';

  const origins = (env.API_ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const locales = (env.ENABLED_LOCALES ?? 'fr,en')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return {
    environment,
    version: env.APP_VERSION ?? '0.0.0',
    allowedOrigins: origins,
    brand: {
      name: env.BRAND_NAME ?? 'WhatsAuto AI',
      logoUrl: env.BRAND_LOGO_URL ?? null,
      primaryColor: env.BRAND_PRIMARY_COLOR ?? '#16a34a',
    },
    enabledLocales: locales,
  };
}
