// hooks/useProjects.ts
import { useCallback, useEffect, useState } from "react";
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
  bulkUpdateProjects, // ✅ this exists in your API file
} from "../api/projects";
import { openSSE } from "../utils/sse";
import { BASE_URL } from "../../../shared/api/api";

/**
 * Hook that manages the list of projects:
 * - loads paginated/sorted/filtered projects
 * - listens to SSE for live updates
 * - exposes pagination, sorting, filtering controls
 * - supports delete and bulk operations (status, tags) via bulkUpdateProjects
 */
export function useProjects(initial: ProjectListParams = {}) {
  // Current query params (pagination, sorting, filters)
  const [params, setParams] = useState<ProjectListParams>({
    page: 1,
    page_size: 12,
    sort_by: "last_updated",
    sort_dir: "desc",
    ...initial,
  });

  // Data + state
  const [items, setItems] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * SSE subscription:
   * - project_created / project_recovered → refetch list (respect filters)
   * - project_deleted → remove from list
   * - project_updated → patch item in place
   *
   * Adjust `msg.type` and payload fields to match your backend events.
   */
  useEffect(() => {
    const close = openSSE(`${BASE_URL}/stream`, (msg) => {
      if (msg.type === "project_created" || msg.type === "project_recovered") {
        // refetch using current params
        fetchProjects();
        return;
      }

      if (msg.type === "project_deleted") {
        setItems((curr) => curr.filter((p) => p.id !== msg.id));
        return;
      }

      if (msg.type === "project_updated") {
        setItems((curr) =>
          curr.map((p) =>
            p.id === msg.id ? { ...p, ...(msg.patch ?? {}) } : p
          )
        );
      }
    });

    return () => close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load projects according to current params.
   */
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res: ProjectListResponse = await getProjects(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // -------------------------
  // Pagination / sorting / filters
  // -------------------------

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

  // -------------------------
  // Single-item operations
  // -------------------------

  const softDelete = async (id: number) => {
    await deleteProject(id);
    await fetchProjects();
  };

  // NOTE: your current API file does NOT define recoverProject,
  // so we drop the recover() helper for now. If you later add
  // a recoverProject() function to the API, you can reintroduce it here.

  // -------------------------
  // Bulk operations
  // -------------------------
  // These use bulkUpdateProjects(), which expects a ProjectsBulkRequest.
  // That request type likely has fields like: action, ids, versions, etc.
  // (see your ../types/project.ts)
  // We wrap it in more ergonomic helpers for the UI.

  const bulkUpdateStatus = async (
    ids: number[],
    versions: Record<number, number>,
    newStatus: ProjectStatus
  ): Promise<ProjectsBulkResponse> => {
    const res = await bulkUpdateProjects({
      action: "update_status",
      ids,
      versions,
      new_status: newStatus,
    });

    // Optimistic-ish: patch status locally for the selected ids
    if (res.updated_count > 0) {
      setItems((curr) =>
        curr.map((p) => (ids.includes(p.id) ? { ...p, status: newStatus } : p))
      );
    }

    // Safer: always refetch to ensure consistency
    await fetchProjects();
    return res;
  };

  const bulkAddTag = async (
    ids: number[],
    versions: Record<number, number>,
    tag: string
  ): Promise<ProjectsBulkResponse> => {
    const res = await bulkUpdateProjects({
      action: "add_tag",
      ids,
      versions,
      tag,
    });

    if (res.updated_count > 0) {
      setItems((curr) =>
        curr.map((p) =>
          ids.includes(p.id) && !p.tags.includes(tag)
            ? { ...p, tags: [...p.tags, tag] }
            : p
        )
      );
    }

    await fetchProjects();
    return res;
  };

  const bulkRemoveTag = async (
    ids: number[],
    versions: Record<number, number>,
    tag: string
  ): Promise<ProjectsBulkResponse> => {
    const res = await bulkUpdateProjects({
      action: "remove_tag",
      ids,
      versions,
      tag,
    });

    if (res.updated_count > 0) {
      setItems((curr) =>
        curr.map((p) =>
          ids.includes(p.id)
            ? { ...p, tags: p.tags.filter((t) => t !== tag) }
            : p
        )
      );
    }

    await fetchProjects();
    return res;
  };

  return {
    // data
    items,
    total,

    // status
    loading,
    error,

    // params + controls
    params,
    fetch: fetchProjects,
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
