import {
  Project,
  ProjectListParams,
  ProjectListResponse,
  Milestone,
  TeamMember,
  EventItem,
} from "./types/project";
import { toTagArray } from "./utils/tags";

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://127.0.0.1:8000";

async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (Array.isArray(body?.detail)) {
        message = body.detail
          .map((d: any) => d.msg || d.detail || JSON.stringify(d))
          .join("; ");
      } else if (body?.detail) {
        message =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {}
    throw new Error(message);
  }
  return (await res.json()) as T;
}

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
  };
}

export async function getProject(id: number | string): Promise<Project> {
  const data = await http<any>(`${BASE_URL}/projects/${id}`);
  return normalizeProject(data);
}

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
    return [];
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
