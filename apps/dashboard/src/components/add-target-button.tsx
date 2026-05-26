/**
 * Bouton "Ajouter une cible" + modale. Composant client monté sur la page
 * détail d'un stream (stream-detail.tsx).
 *
 * Deux modes mutuellement exclusifs (cf. api#18 — backend) :
 * - **Plateforme connectée** : sélection dans la liste des Platforms OAuth.
 *   POST /streams/{id}/targets avec { platform_id }. Target créée en pending,
 *   provision_target ira chercher rtmp_url/stream_key via l'API de la plateforme.
 * - **RTMP custom** : saisie directe rtmp_url + stream_key. Target créée en
 *   ready immédiatement (idéal pour MediaMTX local ou ingest tiers).
 */
"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api-client";
import { useAddTarget, usePlatforms } from "@/lib/api-hooks";
import { cn } from "@/lib/cn";
import type { StreamTargetCreate } from "@/lib/types";

type Mode = "oauth" | "manual";

export function AddTargetButton({
  streamId,
  disabled,
}: {
  streamId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Impossible pendant un live en cours" : undefined}
        className={cn(
          "rounded border px-3 py-1 text-xs hover:bg-accent",
          disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
        )}
      >
        + Ajouter une cible
      </button>
      {open && (
        <AddTargetModal streamId={streamId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function AddTargetModal({
  streamId,
  onClose,
}: {
  streamId: string;
  onClose: () => void;
}) {
  const platformsQ = usePlatforms();
  const addMut = useAddTarget(streamId);

  const platforms = platformsQ.data?.items.filter((p) => p.is_active) ?? [];
  // Auto-bascule en mode manuel si aucune platform OAuth dispo (cas dev/MediaMTX).
  const [mode, setMode] = useState<Mode>(platforms.length > 0 ? "oauth" : "manual");
  const [platformId, setPlatformId] = useState<string>("");
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");

  // Si la query arrive après le 1er render et change le défaut, on initialise
  // platformId une fois. Pas de useEffect — juste un fallback lazy.
  if (mode === "oauth" && platformId === "" && platforms.length > 0) {
    setPlatformId(platforms[0]!.id);
  }

  const canSubmit = (() => {
    if (addMut.isPending) return false;
    if (mode === "oauth") return platformId.length > 0;
    return rtmpUrl.trim().length > 0 && streamKey.trim().length > 0;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: StreamTargetCreate =
      mode === "oauth"
        ? { platform_id: platformId }
        : { rtmp_url: rtmpUrl.trim(), stream_key: streamKey.trim() };

    try {
      await addMut.mutateAsync(payload);
      onClose();
    } catch {
      // L'erreur reste affichée inline dans la modale.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-target-title"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-lg border bg-background p-6 shadow-lg"
      >
        <h2 id="add-target-title" className="text-lg font-semibold">
          Ajouter une cible de diffusion
        </h2>

        {/* Toggle modes */}
        <div className="flex gap-2 rounded border p-1 text-xs">
          <ModeButton
            active={mode === "oauth"}
            onClick={() => setMode("oauth")}
            disabled={platforms.length === 0}
          >
            Plateforme connectée
            {platforms.length === 0 && " (aucune)"}
          </ModeButton>
          <ModeButton
            active={mode === "manual"}
            onClick={() => setMode("manual")}
          >
            RTMP custom
          </ModeButton>
        </div>

        {mode === "oauth" ? (
          <Field
            label="Plateforme"
            hint="Sélectionnée parmi les comptes OAuth actifs. Le rtmp_url et le stream_key seront récupérés automatiquement au démarrage."
            required
          >
            {platformsQ.isLoading ? (
              <div className="text-xs text-muted-foreground">Chargement…</div>
            ) : platforms.length === 0 ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                Aucune plateforme OAuth connectée. Connecte un compte
                YouTube/Twitch/Facebook depuis la page Platforms, ou utilise le
                mode <strong>RTMP custom</strong>.
              </div>
            ) : (
              <select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                required
                className="w-full rounded border px-2 py-1.5 text-sm"
              >
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name} ({p.provider})
                  </option>
                ))}
              </select>
            )}
          </Field>
        ) : (
          <>
            <Field
              label="URL RTMP"
              hint="Ex: rtmp://localhost:1935/mediamtx (test local) ou rtmp://mediamtx.railway.internal:1935 (staging Railway)."
              required
            >
              <input
                type="text"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                maxLength={1024}
                required
                placeholder="rtmp://…"
                className="w-full rounded border px-2 py-1.5 text-sm font-mono"
              />
            </Field>
            <Field
              label="Stream key"
              hint="Identifiant du flux côté serveur RTMP (ex: 'demo-test' pour MediaMTX). Stocké chiffré côté API."
              required
            >
              <input
                type="text"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                maxLength={512}
                required
                placeholder="…"
                className="w-full rounded border px-2 py-1.5 text-sm font-mono"
              />
            </Field>
          </>
        )}

        {addMut.error && (
          <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {formatMutationError(addMut.error)}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "rounded bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90",
              !canSubmit && "opacity-50",
            )}
          >
            {addMut.isPending ? "Ajout…" : "Ajouter la cible"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 rounded px-2 py-1.5 transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-accent",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function formatMutationError(err: Error): string {
  if (err instanceof ApiError) {
    const detail =
      typeof err.body === "string"
        ? err.body
        : err.body && typeof err.body === "object" && "detail" in err.body
          ? String((err.body as { detail: unknown }).detail)
          : err.message;
    return `Erreur ${err.status} : ${detail}`;
  }
  return err.message;
}
