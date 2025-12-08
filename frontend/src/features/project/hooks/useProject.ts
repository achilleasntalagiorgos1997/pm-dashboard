import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  Project,
  Milestone,
  TeamMember,
  EventItem,
} from "../types/project";
import { openSSE } from "../utils/sse";
import { BASE_URL } from "../../../shared/api/api";
import { useProjectQuery } from "../queries/useProjectQuery";
import { useMilestonesQuery } from "../queries/useMilestonesQuery";
import { useTeamQuery } from "../queries/useTeamQuery";
import { useEventsQuery } from "../queries/useEventsQuery";
import { useUpdateProjectMutation } from "../mutations/useUpdateProjectMutation";
import { useDeleteProjectMutation } from "../mutations/useDeleteProjectMutation";

// src/features/project/hooks/useProject.ts
export function useProject(id?: string) {
  const queryClient = useQueryClient();
  const numericId = id ? parseInt(id, 10) : undefined;

  // ---- Queries (read) ----
  const projectQuery = useProjectQuery(numericId);
  const milestonesQuery = useMilestonesQuery(numericId);
  const teamQuery = useTeamQuery(numericId);
  const eventsQuery = useEventsQuery(numericId);

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

  // ---- SSE subscription (live updates) ----
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

  // ---- Mutations (write) ----
  const updateMutation = useUpdateProjectMutation(numericId);
  const deleteMutation = useDeleteProjectMutation(numericId);

  const save = (payload: Partial<Omit<Project, "id">>) =>
    updateMutation.mutateAsync(payload);

  const remove = () => deleteMutation.mutateAsync();

  // ---- Refresh helper ----
  const refresh = async () => {
    if (!numericId) return;
    await Promise.all([
      projectQuery.refetch(),
      milestonesQuery.refetch(),
      teamQuery.refetch(),
      eventsQuery.refetch(),
    ]);
  };

  // ---- Derived: milestone completion percentage ----
  const milestonesPct = useMemo(() => {
    if (!milestones.length) return null;
    const done = milestones.filter((m) => m.done).length;
    return Math.round((done / milestones.length) * 100);
  }, [milestones]);

  // ---- Exposed setters (write directly to cache) ----
  const setProject = (p: Project | null) =>
    queryClient.setQueryData(["project", numericId], p);

  const setMilestones = (ms: Milestone[]) =>
    queryClient.setQueryData(["milestones", numericId], ms);

  const setTeam = (t: TeamMember[]) =>
    queryClient.setQueryData(["team", numericId], t);

  const setEvents = (ev: EventItem[]) =>
    queryClient.setQueryData(["events", numericId], ev);

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
