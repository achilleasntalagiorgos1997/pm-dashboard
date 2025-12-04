import { useCallback, useEffect, useState } from "react";
import { Project, Milestone, TeamMember, EventItem } from "../types/project";
import {
  getProject,
  getMilestones,
  getTeam,
  getEvents,
  updateProject,
  deleteProject,
} from "../api/projects";
import { openSSE } from "../utils/sse";
/**
 * Single-project hook for the detail page:
 * - Loads project, milestones, team, events in parallel
 * - Exposes save (PUT) and remove (soft delete)
 * - Computes derived milestones percent
 */
export function useProject(id?: string) {
  const [project, setProject] = useState<Project | null>(null);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const [loading, setLoading] = useState<boolean>(!!id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const base =
      (import.meta as any).env?.VITE_API_URL ?? "http://127.0.0.1:8000";
    const close = openSSE(`${base}/stream`, (msg) => {
      if (msg.type === "project_updated" && msg.id === project?.id) {
        setProject((p) => (p ? { ...p, ...(msg.patch ?? {}) } : p));
      }
      if (msg.type === "event_created" && msg.project_id === project?.id) {
        setEvents((evs) => {
          const next = [msg.event, ...evs];
          return next.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
        });
      }
      if (msg.type === "project_deleted" && msg.id === project?.id) {
        // optional: navigate("/") or show a banner
      }
    });
    return () => close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, project?.id]);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [p, ms, tm, ev] = await Promise.all([
        getProject(id),
        getMilestones(id),
        getTeam(id),
        getEvents(id),
      ]);
      setProject(p);
      setMilestones(ms);
      setTeam(tm);
      // sort events desc by time if backend unsorted
      setEvents(
        ev.slice().sort((a, b) => (b.at || "").localeCompare(a.at || ""))
      );
    } catch (e: any) {
      setError(e.message || "Unable to load project.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const save = async (payload: Partial<Omit<Project, "id">>) => {
    if (!project) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProject(project.id, payload);
      setProject(updated);
      return updated;
    } catch (e: any) {
      setError(e.message || "Failed to save changes.");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!project) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProject(project.id);
    } catch (e: any) {
      setError(e.message || "Failed to delete project.");
      throw e;
    } finally {
      setDeleting(false);
    }
  };

  const milestonesPct = milestones.length
    ? Math.round(
        (milestones.filter((m) => m.done).length / milestones.length) * 100
      )
    : null;

  return {
    project,
    milestones,
    team,
    events,
    milestonesPct,
    loading,
    error,
    saving,
    deleting,
    save,
    remove,
    refresh: fetchAll,
    setProject,
    setMilestones,
    setTeam,
    setEvents,
  };
}
