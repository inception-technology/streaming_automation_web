/**
 * Bouton "Préset MediaMTX" — crée 3 cibles RTMP custom en 1 clic, pointant
 * toutes vers le même MediaMTX (staging) avec des stream keys distincts.
 *
 * Pensé pour les démos : MediaMTX restream le push RTMP en HLS sur 3 URLs
 * publiques (demo-twitch, demo-youtube, demo-facebook_live) qui simulent les
 * 3 plateformes sans dépendre de leur OAuth ni de leur ingest.
 *
 * Conditions d'affichage :
 * - `NEXT_PUBLIC_MEDIAMTX_RTMP_URL` doit être défini à build-time (sinon le
 *   bouton n'est pas rendu — masqué en prod).
 * - Côté API : `ALLOW_CUSTOM_RTMP_TARGETS=true` (défaut en staging) sinon les
 *   POST renvoient 403 et l'erreur s'affiche inline.
 */
"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api-client";
import { useAddTarget } from "@/lib/api-hooks";
import { cn } from "@/lib/cn";

// Inliné à build-time par Next.js. Si l'env var n'est pas set, le bouton est
// masqué (cf. early return ci-dessous).
const MEDIAMTX_RTMP_URL = process.env.NEXT_PUBLIC_MEDIAMTX_RTMP_URL;

// Stream keys utilisés côté MediaMTX — les 3 paths HLS publics dérivés sont :
//   ${NEXT_PUBLIC_MEDIAMTX_HLS_PUBLIC_URL}/<key>/
// Ordre figé pour matcher les URLs de démo communiquées.
const MEDIAMTX_STREAM_KEYS = ["demo-twitch", "demo-youtube", "demo-facebook_live"] as const;

export function MediaMtxPresetButton({
  streamId,
  disabled,
}: {
  streamId: string;
  disabled?: boolean;
}) {
  const addMut = useAddTarget(streamId);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!MEDIAMTX_RTMP_URL) return null;

  async function handleClick() {
    if (!MEDIAMTX_RTMP_URL) return; // narrowing pour TS — déjà filtré au-dessus
    const ok = confirm(
      `Créer ${MEDIAMTX_STREAM_KEYS.length} cibles RTMP vers MediaMTX ?\n\n` +
        `URL : ${MEDIAMTX_RTMP_URL}\n` +
        `Stream keys : ${MEDIAMTX_STREAM_KEYS.join(", ")}`,
    );
    if (!ok) return;

    setError(null);
    setProgress(0);
    let done = 0;
    for (const key of MEDIAMTX_STREAM_KEYS) {
      try {
        await addMut.mutateAsync({
          rtmp_url: MEDIAMTX_RTMP_URL,
          stream_key: key,
        });
        done += 1;
        setProgress(done);
      } catch (err) {
        // On stoppe à la 1ère erreur — soit le user retire manuellement les
        // cibles déjà créées, soit il retente après correction (les targets
        // déjà créées feront simplement échouer le retry sur ce key précis).
        const msg =
          err instanceof ApiError
            ? `${err.status} : ${typeof err.body === "string" ? err.body : err.message}`
            : (err as Error).message;
        setError(`Cible "${key}" : ${msg}`);
        return;
      }
    }
  }

  const isLoading = addMut.isPending;
  const label = isLoading
    ? `Création… ${progress}/${MEDIAMTX_STREAM_KEYS.length}`
    : `Préset MediaMTX (×${MEDIAMTX_STREAM_KEYS.length})`;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        title={
          disabled
            ? "Impossible pendant un live en cours"
            : `Crée ${MEDIAMTX_STREAM_KEYS.length} cibles RTMP custom vers ${MEDIAMTX_RTMP_URL}`
        }
        className={cn(
          "rounded border px-3 py-1 text-xs hover:bg-accent",
          (disabled || isLoading) && "opacity-50 cursor-not-allowed hover:bg-transparent",
        )}
      >
        {label}
      </button>
      {error && (
        <div className="max-w-xs rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
