import React from "react";
import { useNavigate } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import TagBadge from "./TagBadge";
import type { Project } from "../types/project";

const ProjectCard = ({ project }: { project: Project }) => {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-2xl shadow p-4 flex flex-col cursor-pointer hover:shadow-lg transition"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <h2 className="text-lg font-semibold">{project.title}</h2>
      <p className="text-sm text-gray-600 flex-1">{project.description}</p>
      <div className="mt-2 text-sm text-gray-500">Owner: {project.owner}</div>
      <div className="mt-2 text-sm">Status: {project.status}</div>
      <div className="mt-2 flex gap-2 flex-wrap">
        {project.tags.map((t, idx) => (
          <React.Fragment key={idx}>
            <TagBadge tag={t} />
          </React.Fragment>
        ))}
      </div>
      <div className="mt-2">
        <ProgressBar progress={project.progress} />
      </div>
    </div>
  );
};

export default ProjectCard;
