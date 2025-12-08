// src/features/project/api/projects.ts

// Feature-agnostic HTTP helper from the shared layer
import { http } from "../../../shared/api/api";

// Project feature types
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

// Project-related utilities
import { toTagArray } from "../utils/tags";

/**
 * Normalize a raw project object coming from the backend into
 * a fully-typed Project with safe default values.
 */
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
    version: p.version ?? 1,
  };
}

/**
 * Build query string from ProjectListParams.
 * Adjust keys to match your backend expectations.
 */
function buildProjectListQuery(params: ProjectListParams): string {
  const searchParams = new URLSearchParams();

  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.page_size != null)
    searchParams.set("page_size", String(params.page_size));
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_dir) searchParams.set("sort_dir", params.sort_dir);
  if (params.status) searchParams.set("status", params.status);
  if (params.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

/**
 * Fetch a paginated list of projects.
 */
export async function getProjects(
  params: ProjectListParams
): Promise<ProjectListResponse> {
  const query = buildProjectListQuery(params);

  // Raw response type is unknown, we normalize it into ProjectListResponse
  const data = await http<any>(`/projects/${query}`);

  return {
    total: data.total ?? 0,
    page: data.page ?? params.page ?? 1,
    page_size: data.page_size ?? params.page_size ?? 10,
    items: Array.isArray(data.items) ? data.items.map(normalizeProject) : [],
  };
}

/**
 * Fetch a single project by id.
 */
export async function getProject(id: number | string): Promise<Project> {
  const data = await http<any>(`/projects/${id}`);
  return normalizeProject(data);
}

/**
 * Create a new project.
 * Adjust payload type if you have a dedicated `ProjectCreate` type.
 */
export async function createProject(
  payload: Partial<Project>
): Promise<Project> {
  const data = await http<any>("/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return normalizeProject(data);
}

/**
 * Update an existing project.
 */
export async function updateProject(
  id: number | string,
  payload: Partial<Project>
): Promise<Project> {
  const data = await http<any>(`/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return normalizeProject(data);
}

/**
 * Soft-delete / delete a project.
 * Adjust method or URL if your backend uses something else.
 */
export async function deleteProject(id: number | string): Promise<void> {
  await http<void>(`/projects/${id}`, {
    method: "DELETE",
  });
}

/**
 * Bulk operations on projects (if your backend supports it).
 */
export async function bulkUpdateProjects(
  payload: ProjectsBulkRequest
): Promise<ProjectsBulkResponse> {
  const data = await http<ProjectsBulkResponse>("/projects/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return data;
}

/**
 * Fetch milestones for a project.
 */
export async function getMilestones(
  projectId: number | string
): Promise<Milestone[]> {
  try {
    const data = await http<any[]>(`/projects/${projectId}/milestones`);

    return Array.isArray(data)
      ? data.map((m) => ({
          id: m.id,
          project_id: m.project_id,
          title: m.title ?? "",
          done: !!m.done,
        }))
      : [];
  } catch {
    // Swallow API errors and return empty arrays so UI can degrade gracefully
    return [];
  }
}

/**
 * Fetch team members for a project.
 */
export async function getTeam(
  projectId: number | string
): Promise<TeamMember[]> {
  try {
    const data = await http<any[]>(`/projects/${projectId}/team`);

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

/**
 * Fetch event timeline for a project.
 */
export async function getEvents(
  projectId: number | string
): Promise<EventItem[]> {
  try {
    const data = await http<any[]>(`/projects/${projectId}/events`);

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
