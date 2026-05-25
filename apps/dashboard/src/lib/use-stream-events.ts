/**
 * Hook React qui maintient une WebSocket ouverte vers /ws/streams/{id}
 * et pousse chaque event reçu dans le cache TanStack Query — les badges et
 * status se rafraîchissent automatiquement sans refetch HTTP.
 *
 * Reconnexion exponentielle (max 30 s) en cas de coupure réseau.
 */
"use client";

import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { Stream, StreamEvent, StreamTarget } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function toWsUrl(httpUrl: string, path: string, token: string): string {
  const url = new URL(path, httpUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("token", token);
  return url.toString();
}

export type WsStatus = "connecting" | "open" | "closed";

export function useStreamEvents(streamId: string): WsStatus {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<WsStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    let retry = 0;

    async function connect(): Promise<void> {
      if (cancelledRef.current) return;
      const token = await getToken();
      if (!token) {
        setStatus("closed");
        return;
      }
      const url = toWsUrl(API_URL, `/ws/streams/${streamId}`, token);
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => {
        retry = 0;
        setStatus("open");
      };

      ws.onmessage = (msg) => {
        let event: StreamEvent;
        try {
          event = JSON.parse(msg.data) as StreamEvent;
        } catch {
          return;
        }
        applyEventToCache(qc, streamId, event);
      };

      ws.onclose = (closeEvent) => {
        setStatus("closed");
        // 4401 (auth) / 4404 (not found) : pas de reconnexion automatique —
        // ça ne se résoudra pas tout seul.
        if (cancelledRef.current || closeEvent.code === 4401 || closeEvent.code === 4404) {
          return;
        }
        // Backoff exponentiel : 1s, 2s, 4s, ..., max 30s.
        const delay = Math.min(30_000, 1000 * 2 ** retry);
        retry += 1;
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose suivra — c'est lui qui gère le retry.
      };
    }

    void connect();

    return () => {
      cancelledRef.current = true;
      const ws = wsRef.current;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [streamId, getToken, qc]);

  return status;
}

function applyEventToCache(
  qc: ReturnType<typeof useQueryClient>,
  streamId: string,
  event: StreamEvent,
): void {
  if (event.type === "stream.snapshot" || event.type === "stream.status_changed") {
    qc.setQueryData<Stream | undefined>(["stream", streamId], (prev) =>
      prev ? { ...prev, status: event.status } : prev,
    );
    return;
  }
  if (event.type === "stream_target.status_changed") {
    qc.setQueryData<{ items: StreamTarget[]; total: number } | undefined>(
      ["stream-targets", streamId],
      (prev) => {
        if (!prev) return prev;
        const items = prev.items.map((t) =>
          t.id === event.target_id
            ? { ...t, status: event.status, error_message: event.error_message ?? null }
            : t,
        );
        return { ...prev, items };
      },
    );
  }
}
