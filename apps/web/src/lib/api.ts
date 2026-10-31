import { healthResponseSchema, type HealthResponse } from '@whatsauto/contracts';

/**
 * Client HTTP vers l'API.
 * En développement, l'URL est relative : le proxy Vite relaie vers le Worker.
 * Aucun jeton n'est stocké ici (Phase 5 : gestion de session chiffrée).
 */
const BASE_URL = (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? '/api/v1';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let code = 'http_error';
    let message = `Erreur HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // corps non JSON : on conserve le message générique
    }
    throw new ApiError(message, code, response.status);
  }

  return response.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  const payload = await requestJson('/health');
  return healthResponseSchema.parse(payload);
}

export async function fetchMeta(): Promise<{
  brand: { name: string; primaryColor: string };
  version: string;
  environment: string;
}> {
  const payload = (await requestJson('/meta')) as {
    brand: { name: string; primaryColor: string };
    version: string;
    environment: string;
  };
  return payload;
}
