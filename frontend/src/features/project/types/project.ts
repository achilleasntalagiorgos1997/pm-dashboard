// types/project.ts

export type ProjectStatus = "active" | "planning" | "completed" | "inactive";
export type ProjectHealth = "green" | "yellow" | "red";

export interface Project {
  id: number;
  title: string;
  description: string;
  owner: string;
  status: ProjectStatus;
  health: ProjectHealth;
  tags: string[];
  progress: number;
  last_updated: string; // ISO date string
  deleted_at?: string | null;

  /** Optimistic concurrency token; increment on each successful write */
  version: number;
}

export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  done: boolean;
  // optional dates/notes if you add them later
}

export interface TeamMember {
  id: number;
  project_id: number;
  name: string;
  role: string;
  capacity: number; // 0..1
}

export interface EventItem {
  id: number;
  project_id: number;
  kind: string; // created | updated | comment | progress | ...
  message: string;
  at: string; // ISO date string
}

export type ProjectSortKey =
  | "title"
  | "owner"
  | "status"
  | "health"
  | "progress"
  | "last_updated";

/** Listing params stay the same; bulk ops use separate types below */
export interface ProjectListParams {
  search?: any;
  page?: number;
  page_size?: number;
  sort_by?: ProjectSortKey;
  sort_dir?: "asc" | "desc";
  status?: ProjectStatus;
  owner?: string;
  tag?: string;
  health?: ProjectHealth;
  include_deleted?: boolean;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
}

/* ------------------------- Bulk Operations Types ------------------------- */

export type BulkAction = "update_status" | "add_tag" | "remove_tag";

/** Client → server payload for bulk operations (atomic, optimistic concurrency) */
export interface ProjectsBulkRequest {
  action: BulkAction;
  ids: number[];
  /** Map of project id -> version the client last saw */
  versions: Record<number, number>;
  /** Required when action === "update_status" */
  new_status?: ProjectStatus;
  /** Required when action === "add_tag" | "remove_tag" */
  tag?: string;
}

export interface BulkConflict {
  id: number;
  expected: number; // version client sent
  found: number; // current version on server
}

/** Server → client response for bulk operations */
export interface ProjectsBulkResponse {
  updated_count: number;
  conflicts?: BulkConflict[];
}

/** Useful locally in the UI for selections (id -> version) */
export type SelectedVersionMap = Map<number, number>;
