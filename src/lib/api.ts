const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
const apiBaseUrl = configuredApiUrl || '/api';

export const AUTH_TOKEN_KEY = 'autowhatsapp_session';
export const AUTH_UNAUTHORIZED_EVENT = 'autowhatsapp:unauthorized';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function getPublicApiUrl(path: string): string {
  return new URL(`${apiBaseUrl}${path}`, window.location.origin).toString();
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return undefined as T;
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new ApiError('L’API est injoignable. Vérifiez la variable VITE_API_URL et le fonctionnement du backend.', response.status);
  }

  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    throw new ApiError(payload.error || 'La requête n’a pas pu aboutir.', response.status);
  }
  return payload as T;
}
