/**
 * Client minimal vers le backend FastAPI.
 * Côté serveur (RSC, route handlers) : auth via `getToken()` de Clerk server SDK.
 * Côté client : auth via `useAuth().getToken()`.
 *
 * En Phase 1, on remplacera ce client par un package généré depuis l'OpenAPI.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => undefined);
    throw new ApiError(response.status, `API ${response.status}: ${path}`, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
