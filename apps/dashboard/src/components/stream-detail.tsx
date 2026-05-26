"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { AddTargetButton } from "@/components/add-target-button";
import { StatusBadge } from "@/components/status-badge";
import { ApiError } from "@/lib/api-client";
import {
  useRemoveTarget,
  useStartStream,
  useStopStream,
  useStream,
  useStreamTargets,
} from "@/lib/api-hooks";
import type { Stream, StreamTargetList } from "@/lib/types";
import { useStreamEvents, type WsStatus } from "@/lib/use-stream-events";

const STARTABLE_STATUSES = new Set(["draft", "scheduled"]);

interface StreamDetailProps {
  initialStream: Stream;
  initialTargets: StreamTargetList;
}

export function StreamDetail({ initialStream, initialTargets }: StreamDetailProps) {
  const streamId = initialStream.id;
  const qc = useQueryClient();

  // Hydrate le cache TanStack Query avec les données du serveur AVANT le
  // premier render des hooks ci-dessous : ça évite un flash de loading.
  useEffect(() => {
    qc.setQueryData(["stream", streamId], initialStream);
    qc.setQueryData(["stream-targets", streamId], initialTargets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  const streamQ = useStream(streamId, {
    initialData: initialStream,
  });
  const targetsQ = useStreamTargets(streamId, {
    initialData: initialTargets,
  });
  const wsStatus = useStreamEvents(streamId);

  const stream = streamQ.data ?? initialStream;
  const targets = targetsQ.data ?? initialTargets;

  const startMut = useStartStream(streamId);
  const stopMut = useStopStream(streamId);
  const removeMut = useRemoveTarget(streamId);

  // Pendant un live, on désactive l'ajout/suppression de cibles : modifier la
  // composition pendant que FFmpeg pousse n'a pas de sens — il faudrait au
  // moins un arrêt propre du process correspondant.
  const targetsLocked = stream.status === "live";

  function handleDelete(targetId: string) {
    if (!confirm("Retirer cette cible du stream ?")) return;
    removeMut.mutate(targetId);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{stream.title}</h1>
          {stream.description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {stream.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={stream.status} />
            <WsIndicator status={wsStatus} />
          </div>
        </div>
        <div className="flex gap-2">
          {STARTABLE_STATUSES.has(stream.status) && (
            <button
              type="button"
              onClick={() => startMut.mutate()}
              disabled={startMut.isPending}
              className="rounded bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90 disabled:opacity-50"
            >
              {startMut.isPending ? "Démarrage…" : "Démarrer"}
            </button>
          )}
          {stream.status === "live" && (
            <button
              type="button"
              onClick={() => stopMut.mutate()}
              disabled={stopMut.isPending}
              className="rounded bg-rose-600 px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              {stopMut.isPending ? "Arrêt…" : "Arrêter"}
            </button>
          )}
        </div>
      </header>

      {/* Erreurs de mutation start/stop */}
      {(startMut.error || stopMut.error) && (
        <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {formatMutationError(startMut.error ?? stopMut.error)}
        </div>
      )}

      {/* Métadonnées */}
      <section className="rounded border p-4">
        <h2 className="text-sm font-medium">Métadonnées</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <Field label="Programmé" value={formatDate(stream.scheduled_at)} />
          <Field label="Démarré" value={formatDate(stream.started_at)} />
          <Field label="Terminé" value={formatDate(stream.ended_at)} />
          <Field
            label="Source asset"
            value={stream.source_asset_id ? stream.source_asset_id.slice(0, 8) : "—"}
          />
        </dl>
      </section>

      {/* Cibles */}
      <section className="rounded border">
        <header className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-sm font-medium">Cibles ({targets.total})</h2>
          <AddTargetButton streamId={streamId} disabled={targetsLocked} />
        </header>
        {removeMut.error && (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
            Erreur suppression : {formatMutationError(removeMut.error)}
          </div>
        )}
        {targets.items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Aucune cible attachée. Ajoute une plateforme avant de démarrer le live.
          </div>
        ) : (
          <ul className="divide-y">
            {targets.items.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {t.platform_id ? t.platform_id.slice(0, 8) : "custom RTMP"}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                  {t.rtmp_url && (
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {t.rtmp_url}
                    </div>
                  )}
                  {t.error_message && (
                    <div className="mt-1 text-xs text-rose-600">{t.error_message}</div>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right text-xs text-muted-foreground">
                    <div>début : {formatDate(t.started_at)}</div>
                    <div>fin : {formatDate(t.ended_at)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={targetsLocked || removeMut.isPending}
                    title={
                      targetsLocked
                        ? "Impossible pendant un live en cours"
                        : "Retirer cette cible"
                    }
                    className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    aria-label="Retirer cette cible"
                  >
                    {/* Icône poubelle inline (évite une dépendance d'icônes). */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function WsIndicator({ status }: { status: WsStatus }) {
  const labels: Record<WsStatus, string> = {
    connecting: "Connexion temps réel…",
    open: "Temps réel actif",
    closed: "Temps réel déconnecté",
  };
  const colors: Record<WsStatus, string> = {
    connecting: "bg-amber-400",
    open: "bg-emerald-500",
    closed: "bg-slate-400",
  };
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[status]}`} />
      {labels[status]}
    </span>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMutationError(err: Error | null): string {
  if (!err) return "";
  if (err instanceof ApiError) {
    return `Erreur ${err.status} : ${typeof err.body === "string" ? err.body : err.message}`;
  }
  return err.message;
}
