import Link from "next/link";
import { notFound } from "next/navigation";

import { StreamDetail } from "@/components/stream-detail";
import { ApiError } from "@/lib/api-client";
import { apiServerFetch } from "@/lib/api-server";
import type { Stream, StreamTargetList } from "@/lib/types";

interface StreamDetailPageProps {
  params: { id: string };
}

export default async function StreamDetailPage({ params }: StreamDetailPageProps) {
  const { id } = params;

  let stream: Stream;
  let targets: StreamTargetList;
  try {
    [stream, targets] = await Promise.all([
      apiServerFetch<Stream>(`/streams/${id}`),
      apiServerFetch<StreamTargetList>(`/streams/${id}/targets`),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Stream</h1>
        <div className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Erreur de chargement {err instanceof ApiError ? `(${err.status})` : ""}.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        <Link href="/dashboard/streams" className="hover:underline">
          ← Streams
        </Link>
      </div>
      <StreamDetail initialStream={stream} initialTargets={targets} />
    </div>
  );
}
