import React, { useState, useEffect } from "react";
import {
  ProjectHealth,
  ProjectStatus,
  ProjectListParams,
} from "../types/project";

type Props = {
  value: ProjectListParams;
  onChange: (patch: Partial<ProjectListParams>) => void;
  owners?: string[]; // optional: populate from API later
};

const ProjectsFilters: React.FC<Props> = ({ value, onChange, owners = [] }) => {
  const [owner, setOwner] = useState(value.owner ?? "");
  const [status, setStatus] = useState<ProjectStatus | "">(
    (value.status as any) ?? ""
  );
  const [health, setHealth] = useState<ProjectHealth | "">(
    (value.health as any) ?? ""
  );
  const [tag, setTag] = useState(value.tag ?? "");
  const [includeDeleted, setIncludeDeleted] = useState(!!value.include_deleted);

  useEffect(() => {
    setOwner(value.owner ?? "");
    setStatus((value.status as any) ?? "");
    setHealth((value.health as any) ?? "");
    setTag(value.tag ?? "");
    setIncludeDeleted(!!value.include_deleted);
  }, [value]);

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Owner</label>
        <input
          list="owners"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          onBlur={() => onChange({ owner: owner || undefined })}
          className="border rounded p-2"
          placeholder="e.g. Alice"
        />
        {owners.length > 0 && (
          <datalist id="owners">
            {owners.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Status</label>
        <select
          className="border rounded p-2"
          value={status}
          onChange={(e) =>
            onChange({ status: (e.target.value || undefined) as any })
          }
        >
          <option value="">Any</option>
          <option value="active">Active</option>
          <option value="planning">Planning</option>
          <option value="completed">Completed</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Health</label>
        <select
          className="border rounded p-2"
          value={health}
          onChange={(e) =>
            onChange({ health: (e.target.value || undefined) as any })
          }
        >
          <option value="">Any</option>
          <option value="green">Green</option>
          <option value="yellow">Yellow</option>
          <option value="red">Red</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Tag</label>
        <input
          className="border rounded p-2"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onBlur={() => onChange({ tag: tag || undefined })}
          placeholder="e.g. frontend"
        />
      </div>

      <label className="flex items-center gap-2 mb-1">
        <input
          type="checkbox"
          checked={includeDeleted}
          onChange={(e) =>
            onChange({ include_deleted: e.target.checked || undefined })
          }
        />
        <span className="text-sm">Include deleted</span>
      </label>
    </div>
  );
};

export default ProjectsFilters;
