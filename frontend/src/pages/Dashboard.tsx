import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectsFilters from "../features/project/components/ProjectsFilters";
import ProjectsTable from "../features/project/components/ProjectsTable";
import Pagination from "../features/project/components/Pagination";
import ProjectCard from "../features/project/components/ProjectCard";
import { useProjects } from "../features/project/hooks/useProjects";
import type { Project, ProjectStatus } from "../features/project/types/project";

type ViewMode = "table" | "cards";

export default function Dashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("cards"); // default to cards

  const {
    items,
    total,
    params,
    loading,
    error,
    onFilterChange,
    onSortChange,
    onPageChange,
    onPageSizeChange,
    softDelete,
    recover,

    // from updated hook
    bulkUpdateStatus,
    bulkAddTag,
    bulkRemoveTag,
  } = useProjects({ page_size: 12, sort_by: "last_updated", sort_dir: "desc" });

  /* -------------------- Selection state (id -> version) -------------------- */
  const [selected, setSelected] = useState<Map<number, number>>(new Map());
  const selectedIds = useMemo(() => new Set(selected.keys()), [selected]);

  const clearSelection = () => setSelected(new Map());

  const onToggleOne = (id: number, version: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, version);
      return next;
    });
  };

  const onToggleAll = (
    selectAll: boolean,
    rows: { id: number; version: number }[]
  ) => {
    setSelected(() => {
      if (!selectAll) return new Map();
      const next = new Map<number, number>();
      rows.forEach((r) => next.set(r.id, r.version));
      return next;
    });
  };

  // Build ids + versions payloads
  const ids = useMemo(() => Array.from(selected.keys()), [selected]);
  const versions = useMemo(() => {
    const m: Record<number, number> = {};
    selected.forEach((v, id) => (m[id] = v));
    return m;
  }, [selected]);

  /* ----------------------------- Bulk handlers ---------------------------- */
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const doBulkStatus = async (newStatus: ProjectStatus) => {
    if (ids.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await bulkUpdateStatus(ids, versions, newStatus);
      if (res.conflicts?.length) {
        setMsg(
          `Updated ${res.updated_count}, ${res.conflicts.length} conflicted. Refresh and retry those rows.`
        );
      } else {
        setMsg(`Updated ${res.updated_count} projects.`);
      }
      clearSelection();
      // Keep current page; refetch handled in hook
      onPageChange(params.page || 1);
    } catch (e: any) {
      setMsg(e.message || "Bulk status update failed");
    } finally {
      setBusy(false);
    }
  };

  const doBulkAddTag = async () => {
    if (ids.length === 0) return;
    const tag = window.prompt("Tag to add:");
    if (!tag) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await bulkAddTag(ids, versions, tag.trim());
      if (res.conflicts?.length) {
        setMsg(
          `Tagged ${res.updated_count}, ${res.conflicts.length} conflicted.`
        );
      } else {
        setMsg(`Added tag to ${res.updated_count} projects.`);
      }
      clearSelection();
      onPageChange(params.page || 1);
    } catch (e: any) {
      setMsg(e.message || "Bulk add tag failed");
    } finally {
      setBusy(false);
    }
  };

  const doBulkRemoveTag = async () => {
    if (ids.length === 0) return;
    const tag = window.prompt("Tag to remove:");
    if (!tag) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await bulkRemoveTag(ids, versions, tag.trim());
      if (res.conflicts?.length) {
        setMsg(
          `Untagged ${res.updated_count}, ${res.conflicts.length} conflicted.`
        );
      } else {
        setMsg(`Removed tag from ${res.updated_count} projects.`);
      }
      clearSelection();
      onPageChange(params.page || 1);
    } catch (e: any) {
      setMsg(e.message || "Bulk remove tag failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border overflow-hidden">
            <button
              className={`px-3 py-2 text-sm ${
                view === "cards" ? "bg-gray-200" : ""
              }`}
              onClick={() => setView("cards")}
            >
              Cards
            </button>
            <button
              className={`px-3 py-2 text-sm ${
                view === "table" ? "bg-gray-200" : ""
              }`}
              onClick={() => setView("table")}
            >
              Table
            </button>
          </div>
          <button
            onClick={() => navigate("/projects/new")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            + Add New Project
          </button>
        </div>
      </div>

      <ProjectsFilters value={params} onChange={onFilterChange} />

      {loading && <div className="mt-4">Loading...</div>}
      {error && <div className="mt-4 text-red-600">Error: {error}</div>}

      {/* Bulk action bar (only in table view with selection) */}
      {view === "table" && selectedIds.size > 0 && (
        <div className="mt-4 p-3 border rounded-lg flex items-center gap-3 bg-gray-50">
          <span className="text-sm">{selectedIds.size} selected</span>

          <button
            disabled={busy}
            onClick={() => doBulkStatus("active")}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Set Active
          </button>
          <button
            disabled={busy}
            onClick={() => doBulkStatus("planning")}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Set Planning
          </button>
          <button
            disabled={busy}
            onClick={() => doBulkStatus("completed")}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Set Completed
          </button>
          <button
            disabled={busy}
            onClick={() => doBulkStatus("inactive")}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Set Inactive
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <button
            disabled={busy}
            onClick={doBulkAddTag}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Add Tag
          </button>
          <button
            disabled={busy}
            onClick={doBulkRemoveTag}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Remove Tag
          </button>

          <div className="ml-auto">
            <button
              disabled={busy}
              onClick={clearSelection}
              className="px-2 py-1 text-sm text-gray-600 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {msg && <div className="mt-2 text-sm text-gray-700">{msg}</div>}

      {!loading && !error && (
        <>
          {view === "cards" ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((p, idx) => (
                <React.Fragment key={idx}>
                  <ProjectCard project={p as Project} />
                </React.Fragment>
              ))}
              {items.length === 0 && (
                <div className="text-gray-500">No projects found.</div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <ProjectsTable
                items={items as Project[]}
                sortBy={params.sort_by}
                sortDir={params.sort_dir}
                onSortChange={onSortChange}
                onDelete={softDelete}
                onRecover={recover}
                // NEW selection props
                selectable
                selectedIds={selectedIds}
                onToggleOne={onToggleOne}
                onToggleAll={onToggleAll}
              />
            </div>
          )}

          <Pagination
            page={params.page || 1}
            pageSize={params.page_size || 12}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  );
}
