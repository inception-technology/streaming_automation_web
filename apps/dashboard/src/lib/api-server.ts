/**
 * Helpers d'appel API côté serveur (RSC, route handlers).
 * Récupère le JWT Clerk via `auth().getToken()` et délègue à apiFetch.
 *
 * À utiliser dans les Server Components / Route Handlers uniquement.
 */
import { auth } from "@clerk/nextjs/server";

import { apiFetch } from "./api-client";

export async function apiServerFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Pattern aligné sur dashboard/page.tsx existant : `await auth()` fonctionne
  // que Clerk renvoie un objet sync (v5) ou une promise (v6+).
  const { getToken } = await auth();
  const token = await getToken();
  return apiFetch<T>(path, { ...options, token: token ?? undefined });
}
