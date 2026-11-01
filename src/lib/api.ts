const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
const apiBaseUrl = configuredApiUrl || '/api';

export function getPublicApiUrl(path: string): string {
  return new URL(`${apiBaseUrl}${path}`, window.location.origin).toString();
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return undefined as T;
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('L’API est injoignable. Vérifiez la variable VITE_API_URL et le fonctionnement du backend.');
  }

  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error || 'La requête n’a pas pu aboutir.');
  return payload as T;
}
