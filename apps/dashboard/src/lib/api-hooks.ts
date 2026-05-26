/**
 * Hooks d'appel API côté client. Récupèrent le JWT Clerk via `useAuth()`.
 * Wrapper TanStack Query pour les routes nécessaires aux pages streams.
 */
"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { apiFetch } from "./api-client";
import type {
  AssetKind,
  AssetList,
  PlatformList,
  Stream,
  StreamCreate,
  StreamList,
  StreamStartResponse,
  StreamStopResponse,
  StreamTarget,
  StreamTargetCreate,
  StreamTargetList,
} from "./types";

function useAuthedFetch() {
  const { getToken } = useAuth();
  return async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = await getToken();
    return apiFetch<T>(path, { ...options, token: token ?? undefined });
  };
}

export function useStream(
  streamId: string,
  options?: Partial<UseQueryOptions<Stream>>,
) {
  const fetcher = useAuthedFetch();
  return useQuery<Stream>({
    queryKey: ["stream", streamId],
    queryFn: () => fetcher<Stream>(`/streams/${streamId}`),
    ...options,
  });
}

export function useStreamTargets(
  streamId: string,
  options?: Partial<UseQueryOptions<StreamTargetList>>,
) {
  const fetcher = useAuthedFetch();
  return useQuery<StreamTargetList>({
    queryKey: ["stream-targets", streamId],
    queryFn: () => fetcher<StreamTargetList>(`/streams/${streamId}/targets`),
    ...options,
  });
}

export function useStreams(
  params: { status?: string; limit?: number; offset?: number } = {},
  options?: Partial<UseQueryOptions<StreamList>>,
) {
  const fetcher = useAuthedFetch();
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  return useQuery<StreamList>({
    queryKey: ["streams", params],
    queryFn: () => fetcher<StreamList>(`/streams${qs ? `?${qs}` : ""}`),
    ...options,
  });
}

export function useCreateStream() {
  const fetcher = useAuthedFetch();
  const qc = useQueryClient();
  return useMutation<Stream, Error, StreamCreate>({
    mutationFn: (payload) =>
      fetcher<Stream>(`/streams`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      // Toutes les variantes de filtres sur ['streams', ...] doivent se rafraîchir.
      qc.invalidateQueries({ queryKey: ["streams"] });
    },
  });
}

export function useAssets(
  params: { kind?: AssetKind; limit?: number; offset?: number } = {},
  options?: Partial<UseQueryOptions<AssetList>>,
) {
  const fetcher = useAuthedFetch();
  const query = new URLSearchParams();
  if (params.kind) query.set("kind", params.kind);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  const qs = query.toString();
  return useQuery<AssetList>({
    queryKey: ["assets", params],
    queryFn: () => fetcher<AssetList>(`/assets${qs ? `?${qs}` : ""}`),
    ...options,
  });
}

export function usePlatforms(
  options?: Partial<UseQueryOptions<PlatformList>>,
) {
  const fetcher = useAuthedFetch();
  return useQuery<PlatformList>({
    queryKey: ["platforms"],
    queryFn: () => fetcher<PlatformList>(`/platforms?limit=100`),
    ...options,
  });
}

export function useAddTarget(streamId: string) {
  const fetcher = useAuthedFetch();
  const qc = useQueryClient();
  return useMutation<StreamTarget, Error, StreamTargetCreate>({
    mutationFn: (payload) =>
      fetcher<StreamTarget>(`/streams/${streamId}/targets`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stream-targets", streamId] });
    },
  });
}

export function useRemoveTarget(streamId: string) {
  const fetcher = useAuthedFetch();
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (targetId) =>
      fetcher<void>(`/streams/${streamId}/targets/${targetId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stream-targets", streamId] });
    },
  });
}

export function useStartStream(streamId: string) {
  const fetcher = useAuthedFetch();
  const qc = useQueryClient();
  return useMutation<StreamStartResponse>({
    mutationFn: () =>
      fetcher<StreamStartResponse>(`/streams/${streamId}/start`, {
        method: "POST",
      }),
    onSuccess: () => {
      // Refetch immédiat — le workflow va déjà publier des events via WS,
      // mais on s'assure que l'état initial est rafraîchi.
      qc.invalidateQueries({ queryKey: ["stream", streamId] });
      qc.invalidateQueries({ queryKey: ["stream-targets", streamId] });
    },
  });
}

export function useStopStream(streamId: string) {
  const fetcher = useAuthedFetch();
  const qc = useQueryClient();
  return useMutation<StreamStopResponse>({
    mutationFn: () =>
      fetcher<StreamStopResponse>(`/streams/${streamId}/stop`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stream", streamId] });
      qc.invalidateQueries({ queryKey: ["stream-targets", streamId] });
    },
  });
}
