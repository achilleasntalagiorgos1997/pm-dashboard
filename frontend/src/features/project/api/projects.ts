import { http } from "../../../shared/api/api";
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

/* ==================== Normalizers ==================== */

const normalizeProject = (p: any): Project => ({
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
});

const normalizeMilestone = (m: any): Milestone => ({
  id: m.id,
  project_id: m.project_id,
  title: m.title ?? "",
  done: !!m.done,
});

const normalizeTeamMember = (t: any): TeamMember => ({
  id: t.id,
  project_id: t.project_id,
  name: t.name ?? "",
  role: t.role ?? "",
  capacity: Number(t.capacity ?? 0),
});

const normalizeEvent = (e: any): EventItem => ({
  id: e.id,
  project_id: e.project_id,
  kind: e.kind ?? "update",
  message: e.message ?? "",
  at: e.at ?? e.timestamp ?? "",
});

/* ==================== Query Builders ==================== */

const buildProjectListQuery = (params: ProjectListParams): string => {
  const searchParams = new URLSearchParams();

  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.page_size != null)
    searchParams.set("page_size", String(params.page_size));
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_dir) searchParams.set("sort_dir", params.sort_dir);
  if (params.status) searchParams.set("status", params.status);
  if (params.owner) searchParams.set("owner", params.owner);
  if (params.tag) searchParams.set("tag", params.tag);
  if (params.health) searchParams.set("health", params.health);
  if (params.search) searchParams.set("search", params.search);
  if (params.include_deleted) searchParams.set("include_deleted", "true");

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

/* ==================== API Functions ==================== */

export const getProjects = async (
  params: ProjectListParams
): Promise<ProjectListResponse> => {
  const query = buildProjectListQuery(params);
  const data = await http<{
    items: any[];
    total: number;
    page: number;
    page_size: number;
  }>(`/projects/${query}`);

  return {
    total: data.total ?? 0,
    page: data.page ?? params.page ?? 1,
    page_size: data.page_size ?? params.page_size ?? 10,
    items: Array.isArray(data.items) ? data.items.map(normalizeProject) : [],
  };
};

export const getProject = async (id: number | string): Promise<Project> => {
  const data = await http<any>(`/projects/${id}`);
  return normalizeProject(data);
};

export const createProject = async (
  payload: Partial<Project>
): Promise<Project> => {
  const data = await http<any>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeProject(data);
};

export const updateProject = async (
  id: number | string,
  payload: Partial<Project>
): Promise<Project> => {
  const data = await http<any>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeProject(data);
};

export const deleteProject = async (id: number | string): Promise<void> => {
  await http<void>(`/projects/${id}`, { method: "DELETE" });
};

export const bulkUpdateProjects = async (
  payload: ProjectsBulkRequest
): Promise<ProjectsBulkResponse> => {
  return http<ProjectsBulkResponse>("/projects/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getMilestones = async (
  projectId: number | string
): Promise<Milestone[]> => {
  const data = await http<any[]>(`/projects/${projectId}/milestones`);
  return Array.isArray(data) ? data.map(normalizeMilestone) : [];
};

export const getTeam = async (
  projectId: number | string
): Promise<TeamMember[]> => {
  const data = await http<any[]>(`/projects/${projectId}/team`);
  return Array.isArray(data) ? data.map(normalizeTeamMember) : [];
};

export const getEvents = async (
  projectId: number | string
): Promise<EventItem[]> => {
  const data = await http<any[]>(`/projects/${projectId}/events`);
  return Array.isArray(data) ? data.map(normalizeEvent) : [];
};
