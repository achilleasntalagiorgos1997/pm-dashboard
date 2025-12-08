// src/features/project/pages/Dashboard.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

import ProjectsFilters from "../components/ProjectsFilters";
import Pagination from "../components/Pagination";
import ProjectCard from "../components/ProjectCard";

import { useProjects } from "../hooks/useProjects";
import type { Project } from "../types/project";
import { ProjectsHeader } from "../components/ProjectsHeader";

export default function Dashboard() {
  const navigate = useNavigate();

  const {
    items,
    total,
    params,
    loading,
    error,
    onFilterChange,
    onPageChange,
    onPageSizeChange,
    // onSortChange, softDelete, recover, bulkUpdateStatus, bulkAddTag, bulkRemoveTag
    // are no longer needed here
  } = useProjects({
    page_size: 12,
    sort_by: "last_updated",
    sort_dir: "desc",
  });

  return (
    <div className="p-6">
      <ProjectsHeader onAddProject={() => navigate("/projects/new")} />

      <ProjectsFilters value={params} onChange={onFilterChange} />

      {loading && <div className="mt-4">Loading...</div>}
      {error && <div className="mt-4 text-red-600">Error: {error}</div>}

      {!loading && !error && (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((p) => (
              <ProjectCard key={(p as Project).id} project={p as Project} />
            ))}

            {items.length === 0 && (
              <div className="text-gray-500">No projects found.</div>
            )}
          </div>

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
