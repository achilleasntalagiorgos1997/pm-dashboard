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
  listProjects,
  deleteProject,
  recoverProject,
  // NEW: implement this in ../api/projects
  bulkProjects,
} from "../api/projects";
import { openSSE } from "../utils/sse";

export function useProjects(initial: ProjectListParams = {}) {
  const [params, setParams] = useState<ProjectListParams>({
    page: 1,
    page_size: 12,
    sort_by: "last_updated",
    sort_dir: "desc",
    ...initial,
  });

  const [items, setItems] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base =
      (import.meta as any).env?.VITE_API_URL ?? "http://127.0.0.1:8000";
    const close = openSSE(`${base}/stream`, (msg) => {
      if (msg.type === "project_created" || msg.type === "project_recovered") {
        fetch(); // respect filters/pagination
        return;
      }
      if (msg.type === "project_deleted") {
        setItems((curr) => curr.filter((p) => p.id !== msg.id));
        return;
      }
      if (msg.type === "project_updated") {
        // Ensure we also accept a new 'version' if server sends it
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

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: ProjectListResponse = await listProjects(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const onPageChange = (page: number) => setParams((p) => ({ ...p, page }));
  const onPageSizeChange = (page_size: number) =>
    setParams((p) => ({ ...p, page_size, page: 1 }));

  const onSortChange = (
    sort_by: ProjectListParams["sort_by"],
    sort_dir: "asc" | "desc"
  ) => setParams((p) => ({ ...p, sort_by, sort_dir, page: 1 }));

  const onFilterChange = (patch: Partial<ProjectListParams>) =>
    setParams((p) => ({ ...p, ...patch, page: 1 }));

  const softDelete = async (id: number) => {
    await deleteProject(id);
    fetch();
  };

  const recover = async (id: number) => {
    await recoverProject(id);
    fetch();
  };

  /* ====================== BULK OPERATIONS ====================== */

  /**
   * Update status for a set of projects atomically (backend will use a transaction)
   * with optimistic concurrency checks (id -> version).
   */
  const bulkUpdateStatus = async (
    ids: number[],
    versions: Record<number, number>,
    newStatus: ProjectStatus
  ): Promise<ProjectsBulkResponse> => {
    const res = await bulkProjects({
      action: "update_status",
      ids,
      versions,
      new_status: newStatus,
    });
    // Optional optimistic UI refresh for affected rows without a full refetch:
    if (res.updated_count > 0) {
      setItems((curr) =>
        curr.map((p) =>
          ids.includes(p.id)
            ? {
                ...p,
                status: newStatus,
                // If your API returns new versions per id, you can patch them here.
                // Otherwise, force a refetch to stay perfectly in sync:
                // version: (p.version ?? 0) + 1,
              }
            : p
        )
      );
    }
    // Safer: refetch to ensure versions are accurate
    await fetch();
    return res;
  };

  const bulkAddTag = async (
    ids: number[],
    versions: Record<number, number>,
    tag: string
  ): Promise<ProjectsBulkResponse> => {
    const res = await bulkProjects({
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
    await fetch();
    return res;
  };

  const bulkRemoveTag = async (
    ids: number[],
    versions: Record<number, number>,
    tag: string
  ): Promise<ProjectsBulkResponse> => {
    const res = await bulkProjects({
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
    await fetch();
    return res;
  };

  return {
    items,
    total,
    params,
    loading,
    error,
    fetch,
    onPageChange,
    onPageSizeChange,
    onSortChange,
    onFilterChange,
    softDelete,
    recover,

    // NEW exports
    bulkUpdateStatus,
    bulkAddTag,
    bulkRemoveTag,
  };
}
