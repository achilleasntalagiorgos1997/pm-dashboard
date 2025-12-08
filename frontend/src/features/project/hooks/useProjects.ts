// src/features/project/hooks/useProjects.ts
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ProjectListParams,
  ProjectListResponse,
  ProjectStatus,
  ProjectsBulkResponse,
} from "../types/project";
import {
  getProjects,
  deleteProject,
  bulkUpdateProjects,
} from "../api/projects";
import { openSSE } from "../utils/sse";
import { BASE_URL } from "../../../shared/api/api";

/**
 * Hook that manages the list of projects using React Query:
 * - loads paginated/sorted/filtered projects with automatic caching
 * - listens to SSE for live updates (invalidates or patches cache)
 * - exposes pagination, sorting, filtering controls
 * - supports delete and bulk operations via mutations
 */
export function useProjects(initial: ProjectListParams = {}) {
  const queryClient = useQueryClient();

  /* ----------------- Local params: pagination / filters ----------------- */

  const [params, setParams] = useState<ProjectListParams>({
    page: 1,
    page_size: 12,
    sort_by: "last_updated",
    sort_dir: "desc",
    ...initial,
  });

  /* ------------------------------ Query -------------------------------- */

  const { data, isLoading, error } = useQuery<ProjectListResponse>({
    queryKey: ["projects", params],
    queryFn: () => getProjects(params),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  /* ------------------------- SSE (live updates) ------------------------- */

  useEffect(() => {
    const close = openSSE(`${BASE_URL}/stream`, (msg) => {
      if (msg.type === "project_created" || msg.type === "project_recovered") {
        // Refetch all lists (current filters still applied via params in queryKey)
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        return;
      }

      if (msg.type === "project_deleted") {
        // Optimistically remove from current page
        queryClient.setQueryData(
          ["projects", params],
          (old: ProjectListResponse | undefined) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.filter((p) => p.id !== msg.id),
              total: Math.max(0, old.total - 1),
            };
          }
        );
        return;
      }

      if (msg.type === "project_updated") {
        // Patch project in current page
        queryClient.setQueryData(
          ["projects", params],
          (old: ProjectListResponse | undefined) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.map((p) =>
                p.id === msg.id ? { ...p, ...(msg.patch ?? {}) } : p
              ),
            };
          }
        );
      }
    });

    return () => close();
  }, [params, queryClient]);

  /* --------------------------- Mutations --------------------------- */

  // 1) Single delete (soft delete)
  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const softDelete = (id: number) => deleteProjectMutation.mutate(id);

  // Common helpers for bulk mutations
  type BulkStatusPayload = {
    ids: number[];
    versions: Record<number, number>;
    newStatus: ProjectStatus;
  };

  type BulkTagPayload = {
    ids: number[];
    versions: Record<number, number>;
    tag: string;
  };

  // 2) Bulk status update
  const bulkStatusMutation = useMutation<
    ProjectsBulkResponse,
    unknown,
    BulkStatusPayload
  >({
    mutationFn: (payload) =>
      bulkUpdateProjects({
        action: "update_status",
        ids: payload.ids,
        versions: payload.versions,
        new_status: payload.newStatus,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const bulkUpdateStatus = (
    ids: number[],
    versions: Record<number, number>,
    newStatus: ProjectStatus
  ) => bulkStatusMutation.mutateAsync({ ids, versions, newStatus });

  // 3) Bulk add tag
  const bulkAddTagMutation = useMutation<
    ProjectsBulkResponse,
    unknown,
    BulkTagPayload
  >({
    mutationFn: (payload) =>
      bulkUpdateProjects({
        action: "add_tag",
        ids: payload.ids,
        versions: payload.versions,
        tag: payload.tag,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const bulkAddTag = (
    ids: number[],
    versions: Record<number, number>,
    tag: string
  ) => bulkAddTagMutation.mutateAsync({ ids, versions, tag });

  // 4) Bulk remove tag
  const bulkRemoveTagMutation = useMutation<
    ProjectsBulkResponse,
    unknown,
    BulkTagPayload
  >({
    mutationFn: (payload) =>
      bulkUpdateProjects({
        action: "remove_tag",
        ids: payload.ids,
        versions: payload.versions,
        tag: payload.tag,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const bulkRemoveTag = (
    ids: number[],
    versions: Record<number, number>,
    tag: string
  ) => bulkRemoveTagMutation.mutateAsync({ ids, versions, tag });

  /* ---------------- Pagination / sorting / filters ---------------- */

  const onPageChange = (page: number) => setParams((p) => ({ ...p, page }));

  const onPageSizeChange = (page_size: number) =>
    setParams((p) => ({ ...p, page_size, page: 1 }));

  const onSortChange = (
    sort_by: ProjectListParams["sort_by"],
    sort_dir: "asc" | "desc"
  ) =>
    setParams((p) => ({
      ...p,
      sort_by,
      sort_dir,
      page: 1,
    }));

  const onFilterChange = (patch: Partial<ProjectListParams>) =>
    setParams((p) => ({
      ...p,
      ...patch,
      page: 1,
    }));

  /* ------------------------------- Return ------------------------------- */

  return {
    // data
    items,
    total,

    // status
    loading: isLoading,
    error: error ? (error as any).message || "Failed to load projects" : null,

    // params + controls
    params,
    onPageChange,
    onPageSizeChange,
    onSortChange,
    onFilterChange,

    // single-item actions
    softDelete,

    // bulk actions (even if dashboard doesn't use them right now)
    bulkUpdateStatus,
    bulkAddTag,
    bulkRemoveTag,
  };
}
