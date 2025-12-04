// api/projects.ts
import {
  Project,
  ProjectListParams,
  ProjectListResponse,
  Milestone,
  TeamMember,
  EventItem,
  ProjectsBulkRequest,
  ProjectsBulkResponse,
} from "../types/project";
import { toTagArray } from "../utils/tags";

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://127.0.0.1:8000";

/** Generic JSON fetch with FastAPI-friendly error parsing */
async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (Array.isArray((body as any)?.detail)) {
        message = (body as any).detail
          .map((d: any) => d.msg || d.detail || JSON.stringify(d))
          .join("; ");
      } else if ((body as any)?.detail) {
        message =
          typeof (body as any).detail === "string"
            ? (body as any).detail
            : JSON.stringify((body as any).detail);
      }
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

/** Normalize server project shape to UI Project */
function normalizeProject(p: any): Project {
  return {
    id: p.id,
    title: p.title ?? "",
    description: p.description ?? "",
    owner: p.owner ?? "",
    status: p.status ?? "active",
    health: p.health ?? "green",
    tags: toTagArray(p.tags),
    progress: typeof p.progress === "number" ? p.progress : 0,
    last_updated: p.last_updated ?? "",
    deleted_at: p.deleted_at ?? null,
    // NEW: optimistic concurrency token (fallback 0 if server not yet sending it)
    version: typeof p.version === "number" ? p.version : 0,
  };
}

/* =========================
   Listing / CRUD
   ========================= */

export async function listProjects(
  params: ProjectListParams
): Promise<ProjectListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.page_size) q.set("page_size", String(params.page_size));
  if (params.sort_by) q.set("sort_by", params.sort_by);
  if (params.sort_dir) q.set("sort_dir", params.sort_dir);
  if (params.status) q.set("status", params.status);
  if (params.owner) q.set("owner", params.owner);
  if (params.tag) q.set("tag", params.tag);
  if (params.health) q.set("health", params.health);
  if (params.include_deleted) q.set("include_deleted", "true");

  const data = await http<any>(`${BASE_URL}/projects?${q.toString()}`);
  const items: Project[] = Array.isArray(data.items)
    ? data.items.map(normalizeProject)
    : Array.isArray(data)
    ? data.map(normalizeProject) // fallback if API returns a bare array
    : [];

  return {
    items,
    total: Number(data.total ?? items.length ?? 0),
    page: Number(data.page ?? params.page ?? 1),
    page_size: Number(data.page_size ?? params.page_size ?? items.length ?? 0),
  };
}

export async function getProject(id: number | string): Promise<Project> {
  const data = await http<any>(`${BASE_URL}/projects/${id}`);
  return normalizeProject(data);
}

export async function createProject(
  payload: Omit<Project, "id" | "last_updated" | "deleted_at" | "version">
): Promise<Project> {
  const data = await http<any>(`${BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // backend expects tags as list[str]
    body: JSON.stringify({ ...payload, tags: payload.tags }),
  });
  return normalizeProject(data);
}

export async function updateProject(
  id: number,
  payload: Partial<Omit<Project, "id">>
): Promise<Project> {
  const data = await http<any>(`${BASE_URL}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return normalizeProject(data);
}

export async function deleteProject(id: number): Promise<void> {
  // soft delete on server
  await http<void>(`${BASE_URL}/projects/${id}`, { method: "DELETE" });
}

export async function recoverProject(id: number): Promise<Project> {
  const data = await http<any>(`${BASE_URL}/projects/${id}/recover`, {
    method: "POST",
  });
  return normalizeProject(data);
}

/* =========================
   Bulk Operations (atomic + optimistic concurrency)
   ========================= */

export async function bulkProjects(
  payload: ProjectsBulkRequest
): Promise<ProjectsBulkResponse> {
  return http<ProjectsBulkResponse>(`${BASE_URL}/projects/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* =========================
   Sections (milestones / team / events)
   ========================= */

export async function getMilestones(
  projectId: number | string
): Promise<Milestone[]> {
  try {
    const data = await http<any[]>(
      `${BASE_URL}/projects/${projectId}/milestones`
    );
    return Array.isArray(data)
      ? data.map((m) => ({
          id: m.id,
          project_id: m.project_id,
          title: m.title ?? "",
          done: !!m.done,
        }))
      : [];
  } catch {
    return []; // graceful if endpoint not yet implemented
  }
}

export async function getTeam(
  projectId: number | string
): Promise<TeamMember[]> {
  try {
    const data = await http<any[]>(`${BASE_URL}/projects/${projectId}/team`);
    return Array.isArray(data)
      ? data.map((t) => ({
          id: t.id,
          project_id: t.project_id,
          name: t.name ?? "",
          role: t.role ?? "",
          capacity: Number(t.capacity ?? 0),
        }))
      : [];
  } catch {
    return [];
  }
}

export async function getEvents(
  projectId: number | string
): Promise<EventItem[]> {
  try {
    const data = await http<any[]>(`${BASE_URL}/projects/${projectId}/events`);
    return Array.isArray(data)
      ? data.map((e) => ({
          id: e.id,
          project_id: e.project_id,
          kind: e.kind ?? "update",
          message: e.message ?? "",
          at: e.at ?? e.timestamp ?? "",
        }))
      : [];
  } catch {
    return [];
  }
}
