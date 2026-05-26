import Link from "next/link";

import { NewStreamButton } from "@/components/new-stream-button";
import { StatusBadge } from "@/components/status-badge";
import { apiServerFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api-client";
import type { StreamList, StreamStatus } from "@/lib/types";

const VALID_STATUSES: ReadonlyArray<StreamStatus> = [
  "draft",
  "scheduled",
  "live",
  "ended",
  "cancelled",
];

interface StreamsPageProps {
  searchParams: { status?: string };
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

export default async function StreamsPage({ searchParams }: StreamsPageProps) {
  const statusFilter =
    searchParams.status && VALID_STATUSES.includes(searchParams.status as StreamStatus)
      ? (searchParams.status as StreamStatus)
      : undefined;

  let data: StreamList | null = null;
  let loadError: unknown = null;
  try {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    qs.set("limit", "50");
    data = await apiServerFetch<StreamList>(`/streams?${qs.toString()}`);
  } catch (err) {
    loadError = err;
  }

  return (
    <div className="space-y-4">
      {/* Header — visible quel que soit l'état (succès ou erreur). Le bouton
          'Nouveau stream' reste donc accessible même si /streams plante :
          créer un stream n'a pas besoin du listing pour fonctionner. */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Streams</h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.total} {data.total > 1 ? "streams enregistrés" : "stream enregistré"}.
            </p>
          )}
        </div>
        <NewStreamButton />
      </div>

      {loadError ? (
        <LoadErrorBanner error={loadError} />
      ) : (
        <>
          <StatusFilter active={statusFilter} />

          {data!.items.length === 0 ? (
            <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucun stream {statusFilter ? `avec le statut ${statusFilter}` : ""}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Titre</th>
                    <th className="px-4 py-2 font-medium">Statut</th>
                    <th className="px-4 py-2 font-medium">Programmé</th>
                    <th className="px-4 py-2 font-medium">Démarré</th>
                    <th className="px-4 py-2 font-medium">Terminé</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data!.items.map((stream) => (
                    <tr key={stream.id} className="border-t">
                      <td className="px-4 py-2">
                        <Link
                          href={`/dashboard/streams/${stream.id}`}
                          className="font-medium hover:underline"
                        >
                          {stream.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={stream.status} />
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDate(stream.scheduled_at)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDate(stream.started_at)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDate(stream.ended_at)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/dashboard/streams/${stream.id}`}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          Détails →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LoadErrorBanner({ error }: { error: unknown }) {
  const status = error instanceof ApiError ? error.status : null;
  const detail = error instanceof ApiError ? extractDetail(error.body) : null;
  const isAuth = status === 401 || status === 403;
  const isServerError = status !== null && status >= 500;

  // Hint contextualisé en fonction du detail retourné par l'API. Plus précis que
  // les hints génériques basés uniquement sur le code HTTP.
  const knownDetail = detail?.toLowerCase() ?? "";
  const isUnknownUser = knownDetail.includes("unknown") && knownDetail.includes("user");
  const isInvalidToken = knownDetail.includes("invalid") && knownDetail.includes("token");

  return (
    <div className="space-y-2 rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      <div className="font-medium">
        Erreur de chargement{status !== null ? ` (${status})` : ""}
      </div>
      {detail && (
        <div className="rounded border border-rose-300 bg-rose-100 px-2 py-1 font-mono text-xs">
          {detail}
        </div>
      )}
      {isUnknownUser ? (
        <p>
          Ton utilisateur Clerk est authentifié mais introuvable dans la table{" "}
          <code>users</code> de l&apos;API. Cause typique : le webhook Clerk{" "}
          <code>user.created</code> n&apos;est pas configuré pour POST vers{" "}
          <code>/webhooks/clerk</code> sur cet environnement (Clerk Dashboard → Webhooks).
          Workaround temporaire : insérer manuellement la row dans la DB ou
          rejouer le webhook depuis Clerk.
        </p>
      ) : isInvalidToken ? (
        <p>
          Le JWT envoyé n&apos;est pas accepté. Vérifie que{" "}
          <code>CLERK_JWT_ISSUER</code> côté API matche l&apos;instance Clerk du
          dashboard ({process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.slice(0, 16)}…).
        </p>
      ) : isAuth ? (
        <p>
          Authentification refusée par l&apos;API. Le JWT côté dashboard utilise
          l&apos;instance Clerk{" "}
          <code>{process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.slice(0, 16)}…</code>{" "}
          — vérifie que <code>CLERK_JWT_ISSUER</code> côté API matche.
        </p>
      ) : isServerError ? (
        <p>
          L&apos;API a renvoyé une erreur serveur. Regarde les logs Railway / Sentry.
        </p>
      ) : (
        <p>
          Vérifie que <code>NEXT_PUBLIC_API_URL</code> pointe vers une API joignable
          depuis le runtime serveur (et pas <code>localhost</code> en preview).
        </p>
      )}
      <p className="text-xs text-rose-600/80">
        Tu peux quand même créer un stream via le bouton ci-dessus — la création
        passe par le runtime client et n&apos;a pas besoin du listing.
      </p>
    </div>
  );
}

/** Extrait le `detail` d'une réponse FastAPI HTTPException. Tolère :
 * - body déjà parsé (objet)
 * - body string JSON (`{"detail": "..."}`)
 * - body string brut (renvoie tel quel, tronqué à 200 chars). */
function extractDetail(body: unknown): string | null {
  if (body == null) return null;
  if (typeof body === "object" && "detail" in body) {
    const d = (body as { detail: unknown }).detail;
    return typeof d === "string" ? d : JSON.stringify(d);
  }
  if (typeof body !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "detail" in parsed) {
      const d = (parsed as { detail: unknown }).detail;
      return typeof d === "string" ? d : JSON.stringify(d);
    }
  } catch {
    // body n'est pas du JSON — on le renvoie brut (tronqué).
  }
  return body.slice(0, 200);
}

function StatusFilter({ active }: { active?: StreamStatus }) {
  const items: Array<{ label: string; value?: StreamStatus }> = [
    { label: "Tous" },
    { label: "Brouillon", value: "draft" },
    { label: "Programmé", value: "scheduled" },
    { label: "En direct", value: "live" },
    { label: "Terminé", value: "ended" },
    { label: "Annulé", value: "cancelled" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = active === item.value || (!active && !item.value);
        const href = item.value ? `/dashboard/streams?status=${item.value}` : "/dashboard/streams";
        return (
          <Link
            key={item.label}
            href={href}
            className={
              isActive
                ? "rounded border px-3 py-1 text-xs font-medium bg-foreground text-background"
                : "rounded border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
