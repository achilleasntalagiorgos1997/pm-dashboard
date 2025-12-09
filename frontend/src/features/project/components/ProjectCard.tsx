import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import TagBadge from "./TagBadge";
import type { Project } from "../types/project";

type ProjectCardProps = {
  project: Project;
};

const ProjectCard = ({ project }: ProjectCardProps) => {
  // Defensive checks for optional fields
  const title = project.title || "Untitled Project";
  const description = project.description || "No description";

  return (
    <Link
      to={`/projects/${project.id}`}
      className="bg-white rounded-2xl shadow p-4 flex flex-col hover:shadow-lg transition no-underline text-inherit"
      aria-label={`View project: ${title}`}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-gray-600 flex-1">{description}</p>

      <div className="mt-2 text-sm text-gray-500">Owner: {project.owner}</div>
      <div className="mt-2 text-sm">Status: {project.status}</div>

      <div className="mt-2 flex gap-2 flex-wrap">
        {project.tags?.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>

      <div className="mt-2">
        <ProgressBar progress={project.progress} />
      </div>
    </Link>
  );
};

export default ProjectCard;
