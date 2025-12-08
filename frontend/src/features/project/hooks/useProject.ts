// src/features/project/hooks/useProject.ts
import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Project,
  Milestone,
  TeamMember,
  EventItem,
} from "../types/project";
import {
  getProject,
  getMilestones,
  getTeam,
  getEvents,
  updateProject,
  deleteProject,
} from "../api/projects";
import { openSSE } from "../utils/sse";
import { BASE_URL } from "../../../shared/api/api";

export function useProject(id?: string) {
  const queryClient = useQueryClient();
  const numericId = id ? parseInt(id, 10) : undefined;

  /* --------------------------- Queries (read) --------------------------- */

  const projectQuery = useQuery<Project | null>({
    queryKey: ["project", numericId],
    queryFn: () => getProject(numericId!),
    enabled: !!numericId,
  });

  const milestonesQuery = useQuery<Milestone[]>({
    queryKey: ["milestones", numericId],
    queryFn: () => getMilestones(numericId!),
    enabled: !!numericId,
  });

  const teamQuery = useQuery<TeamMember[]>({
    queryKey: ["team", numericId],
    queryFn: () => getTeam(numericId!),
    enabled: !!numericId,
  });

  const eventsQuery = useQuery<EventItem[]>({
    queryKey: ["events", numericId],
    queryFn: async () => {
      const events = await getEvents(numericId!);
      return events
        .slice()
        .sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    },
    enabled: !!numericId,
  });

  const project = projectQuery.data ?? null;
  const milestones = milestonesQuery.data ?? [];
  const team = teamQuery.data ?? [];
  const events = eventsQuery.data ?? [];

  const loading =
    projectQuery.isLoading ||
    milestonesQuery.isLoading ||
    teamQuery.isLoading ||
    eventsQuery.isLoading;

  const firstError =
    projectQuery.error ||
    milestonesQuery.error ||
    teamQuery.error ||
    eventsQuery.error;

  const errorMessage =
    (firstError as any)?.message || "Unable to load project.";

  /* ---------------------- SSE subscription (live) ---------------------- */

  useEffect(() => {
    if (!numericId) return;

    const close = openSSE(`${BASE_URL}/stream`, (msg) => {
      if (msg.type === "project_updated" && msg.id === numericId) {
        queryClient.setQueryData(
          ["project", numericId],
          (old: Project | undefined) => {
            if (!old) return old;
            return { ...old, ...(msg.patch ?? {}) };
          }
        );
      }

      if (msg.type === "event_created" && msg.project_id === numericId) {
        queryClient.setQueryData(
          ["events", numericId],
          (old: EventItem[] | undefined) => {
            if (!old) return old;
            const next = [msg.event, ...old];
            return next.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
          }
        );
      }

      if (msg.type === "project_deleted" && msg.id === numericId) {
        // Optional: navigate away or show banner
      }
    });

    return () => close();
  }, [numericId, queryClient]);

  /* ---------------------------- Mutations ---------------------------- */

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Omit<Project, "id">>) =>
      updateProject(numericId!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["project", numericId], updated);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(numericId!),
    onSuccess: () => {
      // Invalidate all project-related queries
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const save = (payload: Partial<Omit<Project, "id">>) =>
    updateMutation.mutateAsync(payload);

  const remove = () => deleteMutation.mutateAsync();

  /* --------------------------- Refresh helper --------------------------- */

  const refresh = async () => {
    if (!numericId) return;
    await Promise.all([
      projectQuery.refetch(),
      milestonesQuery.refetch(),
      teamQuery.refetch(),
      eventsQuery.refetch(),
    ]);
  };

  /* ---------------------- Derived: milestonesPct ---------------------- */

  const milestonesPct = useMemo(() => {
    if (!milestones.length) return null;
    const done = milestones.filter((m) => m.done).length;
    return Math.round((done / milestones.length) * 100);
  }, [milestones]);

  /* ---------------------- Exposed cache setters ---------------------- */

  const setProject = (p: Project | null) =>
    queryClient.setQueryData(["project", numericId], p);

  const setMilestones = (ms: Milestone[]) =>
    queryClient.setQueryData(["milestones", numericId], ms);

  const setTeam = (t: TeamMember[]) =>
    queryClient.setQueryData(["team", numericId], t);

  const setEvents = (ev: EventItem[]) =>
    queryClient.setQueryData(["events", numericId], ev);

  /* ------------------------------ Return ------------------------------ */

  return {
    project,
    milestones,
    team,
    events,
    milestonesPct,
    loading,
    error: firstError ? errorMessage : null,
    saving: updateMutation.isPending,
    deleting: deleteMutation.isPending,
    save,
    remove,
    refresh,
    setProject,
    setMilestones,
    setTeam,
    setEvents,
  };
}
