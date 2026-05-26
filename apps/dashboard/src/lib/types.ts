// Types miroirs côté front des schemas Pydantic de l'API.
// Phase 1 : on les maintient à la main. Phase 1+ : génération depuis l'OpenAPI.

export type StreamStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled";

export type StreamTargetStatus =
  | "pending"
  | "ready"
  | "streaming"
  | "failed"
  | "ended";

export interface Stream {
  id: string;
  title: string;
  description: string | null;
  status: StreamStatus;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  source_asset_id: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface StreamList {
  items: Stream[];
  total: number;
  limit: number;
  offset: number;
}

// Payload pour POST /streams. Tous les champs sauf `title` sont optionnels.
export interface StreamCreate {
  title: string;
  description?: string | null;
  scheduled_at?: string | null; // ISO 8601
  source_asset_id?: string | null;
}

export interface StreamTarget {
  id: string;
  stream_id: string;
  // Nullable depuis api#18 — les targets manuelles (custom RTMP, ex. MediaMTX)
  // n'ont pas de Platform OAuth associée.
  platform_id: string | null;
  platform_stream_id: string | null;
  rtmp_url: string | null;
  status: StreamTargetStatus;
  error_message: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StreamTargetList {
  items: StreamTarget[];
  total: number;
}

export type PlatformProvider = "youtube" | "twitch" | "facebook_live";

// Miroir de PlatformRead côté API. Les tokens OAuth ne sont JAMAIS exposés
// dans la réponse — accessibles uniquement côté serveur (chiffrés Fernet).
export interface Platform {
  id: string;
  provider: PlatformProvider;
  account_id: string;
  display_name: string;
  connected_by_user_id: string;
  oauth_expires_at: string | null;
  scopes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformList {
  items: Platform[];
  total: number;
  limit: number;
  offset: number;
}

// Payload pour POST /streams/{id}/targets. Deux modes mutuellement exclusifs
// (cf. api#18) : OAuth (platform_id seul) ou manuel (rtmp_url + stream_key).
export type StreamTargetCreate =
  | { platform_id: string }
  | { rtmp_url: string; stream_key: string };

export interface StreamStartResponse {
  stream_id: string;
  temporal_workflow_id: string;
  task_queue: string;
  target_ids: string[];
}

export interface StreamStopResponse {
  stream_id: string;
  temporal_workflow_id: string;
  signal_sent: "end_stream";
}

// ---------- Assets ----------

export type AssetKind = "video" | "image" | "overlay" | "render";
export type AssetBucket = "assets" | "renders" | "replays";

export interface Asset {
  id: string;
  kind: AssetKind;
  bucket: AssetBucket;
  r2_key: string;
  mime_type: string;
  size_bytes: number;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  uploaded_by_user_id: string | null;
  asset_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AssetList {
  items: Asset[];
  total: number;
  limit: number;
  offset: number;
}

// Events poussés par la WebSocket /ws/streams/{id}.
export type StreamEvent =
  | {
      type: "stream.snapshot";
      stream_id: string;
      status: StreamStatus;
      at: string;
    }
  | {
      type: "stream.status_changed";
      stream_id: string;
      status: StreamStatus;
      at: string;
    }
  | {
      type: "stream_target.status_changed";
      stream_id: string;
      target_id: string;
      status: StreamTargetStatus;
      at: string;
      error_message?: string;
    };
