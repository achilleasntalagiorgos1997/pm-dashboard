// hooks/useProjects.ts
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Project,
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
 * - listens to SSE for live updates (invalidates cache when needed)
 * - exposes pagination, sorting, filtering controls
 * - supports delete and bulk operations via mutations
 */
export function useProjects(initial: ProjectListParams = {}) {
  const queryClient = useQueryClient();

  // Current query params (pagination, sorting, filters)
  const [params, setParams] = useState<ProjectListParams>({
    page: 1,
    page_size: 12,
    sort_by: "last_updated",
    sort_dir: "desc",
    ...initial,
  });

  // React Query: fetch projects based on current params
  const { data, isLoading, error } = useQuery({
    queryKey: ["projects", params],
    queryFn: () => getProjects(params),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  // SSE subscription for real-time updates
  useEffect(() => {
    const close = openSSE(`${BASE_URL}/stream`, (msg) => {
      if (msg.type === "project_created" || msg.type === "project_recovered") {
        // Invalidate the list to refetch with current filters
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        return;
      }

      if (msg.type === "project_deleted") {
        // Update cache optimistically
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
        // Patch the item in cache
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

  // Mutation: delete (soft-delete) a project
  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const softDelete = (id: number) => deleteProjectMutation.mutate(id);

  // Mutation: bulk update status
  const bulkStatusMutation = useMutation({
    mutationFn: (payload: {
      ids: number[];
      versions: Record<number, number>;
      newStatus: ProjectStatus;
    }) =>
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

  const bulkUpdateStatus = async (
    ids: number[],
    versions: Record<number, number>,
    newStatus: ProjectStatus
  ): Promise<ProjectsBulkResponse> => {
    return new Promise((resolve, reject) => {
      bulkStatusMutation.mutate(
        { ids, versions, newStatus },
        {
          onSuccess: (data) => resolve(data),
          onError: (error) => reject(error),
        }
      );
    });
  };

  // Mutation: bulk add tag
  const bulkAddTagMutation = useMutation({
    mutationFn: (payload: {
      ids: number[];
      versions: Record<number, number>;
      tag: string;
    }) =>
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

  const bulkAddTag = async (
    ids: number[],
    versions: Record<number, number>,
    tag: string
  ): Promise<ProjectsBulkResponse> => {
    return new Promise((resolve, reject) => {
      bulkAddTagMutation.mutate(
        { ids, versions, tag },
        {
          onSuccess: (data) => resolve(data),
          onError: (error) => reject(error),
        }
      );
    });
  };

  // Mutation: bulk remove tag
  const bulkRemoveTagMutation = useMutation({
    mutationFn: (payload: {
      ids: number[];
      versions: Record<number, number>;
      tag: string;
    }) =>
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

  const bulkRemoveTag = async (
    ids: number[],
    versions: Record<number, number>,
    tag: string
  ): Promise<ProjectsBulkResponse> => {
    return new Promise((resolve, reject) => {
      bulkRemoveTagMutation.mutate(
        { ids, versions, tag },
        {
          onSuccess: (data) => resolve(data),
          onError: (error) => reject(error),
        }
      );
    });
  };

  // Pagination / sorting / filters
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

  return {
    // data
    items,
    total,

    // status (map React Query isLoading to loading for compatibility)
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

    // bulk actions
    bulkUpdateStatus,
    bulkAddTag,
    bulkRemoveTag,
  };
}
