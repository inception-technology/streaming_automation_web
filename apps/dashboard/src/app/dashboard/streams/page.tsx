import Link from "next/link";

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

  let data: StreamList;
  try {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    qs.set("limit", "50");
    data = await apiServerFetch<StreamList>(`/streams?${qs.toString()}`);
  } catch (err) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Streams</h1>
        <div className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Erreur de chargement{" "}
          {err instanceof ApiError ? `(${err.status})` : ""} — vérifie que l&apos;API est
          accessible (NEXT_PUBLIC_API_URL).
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Streams</h1>
          <p className="text-sm text-muted-foreground">
            {data.total} {data.total > 1 ? "streams enregistrés" : "stream enregistré"}.
          </p>
        </div>
      </div>

      <StatusFilter active={statusFilter} />

      {data.items.length === 0 ? (
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
              {data.items.map((stream) => (
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
    </div>
  );
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
