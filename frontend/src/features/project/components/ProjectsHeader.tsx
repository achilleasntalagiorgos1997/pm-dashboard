// src/features/project/components/ProjectsHeader.tsx
import React from "react";

type ProjectsHeaderProps = {
  onAddProject: () => void;
};

export function ProjectsHeader({ onAddProject }: ProjectsHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Projects</h1>
      <button
        onClick={onAddProject}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
      >
        + Add New Project
      </button>
    </div>
  );
}
