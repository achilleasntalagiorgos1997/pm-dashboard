import { useEffect, useState, useCallback } from "react";
import {
  ProjectHealth,
  ProjectStatus,
  ProjectListParams,
} from "../types/project";

type ProjectsFiltersProps = {
  value: ProjectListParams;
  onChange: (patch: Partial<ProjectListParams>) => void;
  owners?: string[];
};

// Constants for select options
const STATUS_OPTIONS: (ProjectStatus | "")[] = [
  "",
  "active",
  "planning",
  "completed",
  "inactive",
];
const HEALTH_OPTIONS: (ProjectHealth | "")[] = ["", "green", "yellow", "red"];

const STATUS_LABELS: Record<string, string> = {
  "": "Any",
  active: "Active",
  planning: "Planning",
  completed: "Completed",
  inactive: "Inactive",
};

const HEALTH_LABELS: Record<string, string> = {
  "": "Any",
  green: "Green",
  yellow: "Yellow",
  red: "Red",
};

const ProjectsFilters = ({
  value,
  onChange,
  owners = [],
}: ProjectsFiltersProps) => {
  // Local form state - not synced to parent until button clicked
  const [ownerInput, setOwnerInput] = useState(value.owner ?? "");
  const [statusInput, setStatusInput] = useState<ProjectStatus | "">(
    (value.status as ProjectStatus) ?? ""
  );
  const [healthInput, setHealthInput] = useState<ProjectHealth | "">(
    (value.health as ProjectHealth) ?? ""
  );
  const [tagInput, setTagInput] = useState(value.tag ?? "");
  const [includeDeletedInput, setIncludeDeletedInput] = useState(
    !!value.include_deleted
  );

  // Sync ONLY when specific filter props change (not on every value change)
  useEffect(() => {
    setOwnerInput(value.owner ?? "");
  }, [value.owner]);

  useEffect(() => {
    setStatusInput((value.status as ProjectStatus) ?? "");
  }, [value.status]);

  useEffect(() => {
    setHealthInput((value.health as ProjectHealth) ?? "");
  }, [value.health]);

  useEffect(() => {
    setTagInput(value.tag ?? "");
  }, [value.tag]);

  useEffect(() => {
    setIncludeDeletedInput(!!value.include_deleted);
  }, [value.include_deleted]);

  // Apply all filters at once when button is clicked
  const handleApplyFilters = useCallback(() => {
    onChange({
      owner: ownerInput || undefined,
      status: statusInput || undefined,
      health: healthInput || undefined,
      tag: tagInput || undefined,
      include_deleted: includeDeletedInput || undefined,
    });
  }, [
    ownerInput,
    statusInput,
    healthInput,
    tagInput,
    includeDeletedInput,
    onChange,
  ]);

  // Reset filters to defaults
  const handleResetFilters = useCallback(() => {
    setOwnerInput("");
    setStatusInput("");
    setHealthInput("");
    setTagInput("");
    setIncludeDeletedInput(false);
    onChange({
      owner: undefined,
      status: undefined,
      health: undefined,
      tag: undefined,
      include_deleted: undefined,
    });
  }, [onChange]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Owner Input */}
        <div>
          <label
            htmlFor="owner-input"
            className="block text-sm text-gray-600 mb-1"
          >
            Owner
          </label>
          <input
            id="owner-input"
            list="owners"
            value={ownerInput}
            onChange={(e) => setOwnerInput(e.target.value)}
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

        {/* Status Select */}
        <div>
          <label
            htmlFor="status-select"
            className="block text-sm text-gray-600 mb-1"
          >
            Status
          </label>
          <select
            id="status-select"
            className="border rounded p-2"
            value={statusInput}
            onChange={(e) =>
              setStatusInput((e.target.value || "") as ProjectStatus | "")
            }
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        {/* Health Select */}
        <div>
          <label
            htmlFor="health-select"
            className="block text-sm text-gray-600 mb-1"
          >
            Health
          </label>
          <select
            id="health-select"
            className="border rounded p-2"
            value={healthInput}
            onChange={(e) =>
              setHealthInput((e.target.value || "") as ProjectHealth | "")
            }
          >
            {HEALTH_OPTIONS.map((health) => (
              <option key={health} value={health}>
                {HEALTH_LABELS[health]}
              </option>
            ))}
          </select>
        </div>

        {/* Tag Input */}
        <div>
          <label
            htmlFor="tag-input"
            className="block text-sm text-gray-600 mb-1"
          >
            Tag
          </label>
          <input
            id="tag-input"
            className="border rounded p-2"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="e.g. frontend"
          />
        </div>

        {/* Include Deleted Checkbox */}
        <label className="flex items-center gap-2 mb-1 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDeletedInput}
            onChange={(e) => setIncludeDeletedInput(e.target.checked)}
            aria-label="Include deleted projects"
          />
          <span className="text-sm">Include deleted</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Apply Filters
        </button>
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default ProjectsFilters;
