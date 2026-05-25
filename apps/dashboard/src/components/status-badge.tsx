import { cn } from "@/lib/cn";
import type { StreamStatus, StreamTargetStatus } from "@/lib/types";

type AnyStatus = StreamStatus | StreamTargetStatus;

const STATUS_STYLES: Record<AnyStatus, string> = {
  // Stream
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  scheduled: "bg-blue-100 text-blue-700 ring-blue-200",
  live: "bg-red-100 text-red-700 ring-red-200",
  ended: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
  // StreamTarget
  pending: "bg-amber-100 text-amber-700 ring-amber-200",
  ready: "bg-blue-100 text-blue-700 ring-blue-200",
  streaming: "bg-red-100 text-red-700 ring-red-200",
  failed: "bg-rose-100 text-rose-700 ring-rose-200",
};

const STATUS_LABELS: Record<AnyStatus, string> = {
  draft: "Brouillon",
  scheduled: "Programmé",
  live: "En direct",
  ended: "Terminé",
  cancelled: "Annulé",
  pending: "En attente",
  ready: "Prêt",
  streaming: "Diffusion",
  failed: "Échec",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      {/* Point clignotant pour les états "en cours" (live / streaming) */}
      {(status === "live" || status === "streaming") && (
        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}
