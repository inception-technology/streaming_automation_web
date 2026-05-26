/**
 * Bouton "Nouveau stream" + modale de création. Composant client.
 * Monté depuis le server component /dashboard/streams/page.tsx.
 *
 * Flow :
 * 1. Clic sur le bouton → ouvre la modale.
 * 2. Submit → POST /streams (via useCreateStream) → redirect vers /dashboard/streams/{newId}.
 * 3. Le stream est créé en statut `draft`. Pour le démarrer ensuite, il faudra
 *    attacher une target (web#7) et set source_asset_id si pas déjà fait.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api-client";
import { useAssets, useCreateStream } from "@/lib/api-hooks";
import { cn } from "@/lib/cn";
import type { StreamCreate } from "@/lib/types";

export function NewStreamButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
      >
        + Nouveau stream
      </button>
      {open && <NewStreamModal onClose={() => setOpen(false)} />}
    </>
  );
}

function NewStreamModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const createMut = useCreateStream();
  // On charge les assets vidéo pour le sélecteur source_asset_id. Si l'API
  // n'a pas d'asset encore (cas dev), on retombera sur "Aucune source" et
  // l'utilisateur pourra créer le stream sans source — il devra la lier plus
  // tard (web#9 ajoutera l'upload depuis l'UI).
  const assetsQ = useAssets({ kind: "video", limit: 100 });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sourceAssetId, setSourceAssetId] = useState("");

  const titleTrimmed = title.trim();
  const canSubmit = titleTrimmed.length > 0 && !createMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: StreamCreate = { title: titleTrimmed };
    if (description.trim()) payload.description = description.trim();
    if (scheduledAt) {
      // datetime-local → ISO 8601. Le navigateur produit "YYYY-MM-DDTHH:mm"
      // sans timezone — on l'interprète comme local et on convertit en ISO UTC.
      const localDate = new Date(scheduledAt);
      if (!Number.isNaN(localDate.getTime())) {
        payload.scheduled_at = localDate.toISOString();
      }
    }
    if (sourceAssetId) payload.source_asset_id = sourceAssetId;

    try {
      const stream = await createMut.mutateAsync(payload);
      // Redirection vers le détail pour que l'utilisateur enchaîne sur
      // l'ajout de targets (web#7).
      router.push(`/dashboard/streams/${stream.id}`);
    } catch {
      // L'erreur est portée par createMut.error et affichée dans le form.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-stream-title"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-lg border bg-background p-6 shadow-lg"
      >
        <div>
          <h2 id="new-stream-title" className="text-lg font-semibold">
            Nouveau stream
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Crée un stream en statut <code>draft</code>. Tu pourras attacher des
            cibles et démarrer le live depuis la page de détail.
          </p>
        </div>

        <Field label="Titre" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            required
            autoFocus
            className="w-full rounded border px-2 py-1.5 text-sm"
            placeholder="Ex: Démo MOC — 26 mai"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full rounded border px-2 py-1.5 text-sm"
            placeholder="Optionnel — résumé du contenu, plan, notes opérateur…"
          />
        </Field>

        <Field
          label="Programmation"
          hint="Optionnel — heure prévue de démarrage. Pas de démarrage automatique."
        >
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </Field>

        <Field
          label="Source vidéo"
          hint={
            assetsQ.isLoading
              ? "Chargement des assets…"
              : assetsQ.data && assetsQ.data.items.length === 0
                ? "Aucun asset vidéo. Tu pourras en lier un plus tard."
                : "Optionnel à la création, requis pour démarrer le live."
          }
        >
          <select
            value={sourceAssetId}
            onChange={(e) => setSourceAssetId(e.target.value)}
            disabled={assetsQ.isLoading || !assetsQ.data?.items.length}
            className="w-full rounded border px-2 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">— Aucune (à définir plus tard)</option>
            {assetsQ.data?.items.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {assetLabel(asset.r2_key, asset.size_bytes, asset.duration_ms)}
              </option>
            ))}
          </select>
        </Field>

        {createMut.error && (
          <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {formatMutationError(createMut.error)}
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
            {createMut.isPending ? "Création…" : "Créer le stream"}
          </button>
        </div>
      </form>
    </div>
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

function assetLabel(r2Key: string, sizeBytes: number, durationMs: number | null): string {
  const filename = r2Key.split("/").pop() ?? r2Key;
  const sizeMb = (sizeBytes / 1024 / 1024).toFixed(1);
  if (durationMs != null) {
    const sec = Math.round(durationMs / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${filename} (${sizeMb} Mo, ${m}m${s.toString().padStart(2, "0")})`;
  }
  return `${filename} (${sizeMb} Mo)`;
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
