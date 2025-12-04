import React from "react";
import { Project, ProjectListParams, ProjectSortKey } from "../types/project";
import ProgressBar from "./ProgressBar";
import TagBadge from "./TagBadge";
import { useNavigate } from "react-router-dom";

type Props = {
  items: Project[];
  sortBy?: ProjectListParams["sort_by"];
  sortDir?: "asc" | "desc";
  onSortChange: (key: ProjectSortKey, dir: "asc" | "desc") => void;
  onDelete: (id: number) => void;
  onRecover: (id: number) => void;

  /** NEW (optional): enable bulk selection */
  selectable?: boolean;
  /** NEW: set of selected IDs (controlled by parent) */
  selectedIds?: Set<number>;
  /** NEW: toggle a single row (parent should store id->version for concurrency) */
  onToggleOne?: (id: number, version: number) => void;
  /** NEW: toggle all visible rows */
  onToggleAll?: (
    selectAll: boolean,
    rows: { id: number; version: number }[]
  ) => void;
};

const headers: { key: ProjectSortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "owner", label: "Owner" },
  { key: "status", label: "Status" },
  { key: "health", label: "Health" },
  { key: "progress", label: "Progress" },
  { key: "last_updated", label: "Last Updated" },
];

const ProjectsTable: React.FC<Props> = ({
  items,
  sortBy,
  sortDir,
  onSortChange,
  onDelete,
  onRecover,

  // NEW optional props
  selectable = false,
  selectedIds,
  onToggleOne,
  onToggleAll,
}) => {
  const navigate = useNavigate();

  const toggleSort = (key: ProjectSortKey) => {
    const nextDir: "asc" | "desc" =
      sortBy === key && sortDir === "asc" ? "desc" : "asc";
    onSortChange(key, nextDir);
  };

  const rowsForSelect = items.map((p) => ({ id: p.id, version: p.version }));

  const allSelected =
    selectable &&
    items.length > 0 &&
    selectedIds &&
    selectedIds.size === items.length;

  return (
    <div className="overflow-auto rounded-xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {selectable && (
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={!!allSelected}
                  onChange={(e) =>
                    onToggleAll?.(e.target.checked, rowsForSelect)
                  }
                />
              </th>
            )}
            {headers.map(({ key, label }) => (
              <th
                key={key}
                className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                onClick={() => toggleSort(key)}
                title="Sort"
              >
                {label}
                {sortBy === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
            ))}
            <th className="px-4 py-3 text-left font-semibold">Tags</th>
            <th className="px-4 py-3 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => {
            const isSelected = !!selectedIds?.has(p.id);
            return (
              <tr key={p.id} className={p.deleted_at ? "opacity-60" : ""}>
                {selectable && (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select project ${p.title}`}
                      checked={isSelected}
                      onChange={() => onToggleOne?.(p.id, p.version)}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <button
                    className="text-blue-600 underline"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    {p.title}
                  </button>
                </td>
                <td className="px-4 py-3">{p.owner}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">{p.health}</td>
                <td className="px-4 py-3">
                  <ProgressBar progress={p.progress} />
                </td>
                <td className="px-4 py-3">{p.last_updated}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {p.tags.map((t, i) => (
                      <React.Fragment key={`${p.id}-${i}-${t}`}>
                        <TagBadge tag={t} />
                      </React.Fragment>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      Edit
                    </button>

                    {!p.deleted_at ? (
                      <button
                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                        onClick={() => onDelete(p.id)}
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
                        onClick={() => onRecover(p.id)}
                      >
                        Recover
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td
                className="px-4 py-6 text-gray-500"
                colSpan={(selectable ? 1 : 0) + headers.length + 2}
              >
                No projects found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectsTable;
