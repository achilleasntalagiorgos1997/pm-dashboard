import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ProgressBar from "../components/ProgressBar";
import TagBadge from "../components/TagBadge";
import Milestones from "../components/Milestones";
import TeamRoster from "../components/TeamRoster";
import ActivityTimeline from "../components/ActivityTimeline";

import { useProject } from "../hooks/useProject"; // ✅ use the single-project hook
import { toTagArray, toTagInput } from "../utils/tags";

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ✅ single-project hook
  const {
    project,
    milestones,
    team,
    events,
    milestonesPct,
    loading,
    error,
    saving,
    deleting,
    save,
    remove,
  } = useProject(id);

  // Local edit state (form fields)
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("active");
  const [health, setHealth] = useState("green");
  const [tagsInput, setTagsInput] = useState("");
  const [progress, setProgress] = useState<number>(0);

  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setTitle(project.title);
    setDescription(project.description);
    setOwner(project.owner);
    setStatus(project.status);
    setHealth(project.health);
    setTagsInput(toTagInput(project.tags));
    setProgress(project.progress);
  }, [project]);

  const hasChanges = useMemo(() => {
    if (!project) return false;
    return (
      title !== project.title ||
      description !== project.description ||
      owner !== project.owner ||
      status !== project.status ||
      health !== project.health ||
      progress !== project.progress ||
      toTagInput(project.tags) !== tagsInput
    );
  }, [project, title, description, owner, status, health, progress, tagsInput]);

  const resetForm = () => {
    if (!project) return;
    setTitle(project.title);
    setDescription(project.description);
    setOwner(project.owner);
    setStatus(project.status);
    setHealth(project.health);
    setTagsInput(toTagInput(project.tags));
    setProgress(project.progress);
  };

  const handleSave = async () => {
    if (!project) return;
    setLocalError(null);
    try {
      await save({
        title,
        description,
        owner,
        status,
        health,
        progress: Number(progress) || 0,
        tags: toTagArray(tagsInput), // send list[str]
      });
      setEditMode(false);
    } catch (e: any) {
      setLocalError(e.message || "Failed to save changes.");
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!confirm("Are you sure you want to delete this project?")) return;
    setLocalError(null);
    try {
      await remove();
      navigate("/");
    } catch (e: any) {
      setLocalError(e.message || "Failed to delete project.");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Link to="/" className="text-blue-500 underline mb-4 inline-block">
          &larr; Back to Dashboard
        </Link>
        <div>Loading project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <p className="mb-2">{error || "Project not found."}</p>
        <Link to="/" className="text-blue-500 underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link to="/" className="text-blue-500 underline mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

      {/* Header & actions */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          {editMode ? "Edit Project" : project.title}
        </h1>
        <div className="flex gap-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  resetForm();
                  setEditMode(false);
                }}
                className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`px-3 py-2 text-white rounded-lg transition ${
                  saving || !hasChanges
                    ? "bg-gray-400"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`px-3 py-2 text-white rounded-lg transition ${
              deleting ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Inline error */}
      {localError && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 border border-red-200">
          {localError}
        </div>
      )}

      {/* Summary / Edit form */}
      {!editMode ? (
        <>
          <p className="text-gray-700 mb-4">{project.description}</p>

          <div className="mb-2">Owner: {project.owner}</div>
          <div className="mb-2">Status: {project.status}</div>
          <div className="mb-2">Health: {project.health}</div>

          <div className="mb-4 flex gap-2 flex-wrap">
            {project.tags.map((t, idx) => (
              <React.Fragment key={idx}>
                <TagBadge tag={t} />
              </React.Fragment>
            ))}
          </div>

          <h3 className="font-semibold mb-1">Progress</h3>
          <ProgressBar progress={project.progress} />

          <div className="mt-4 text-sm text-gray-500">
            Last Updated: {project.last_updated}
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving && hasChanges) handleSave();
          }}
          className="flex flex-col gap-4"
        >
          <input
            type="text"
            className="border p-2 rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            required
          />
          <textarea
            className="border p-2 rounded"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            required
          />
          <input
            type="text"
            className="border p-2 rounded"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Owner"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              className="border p-2 rounded"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="completed">Completed</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              className="border p-2 rounded"
              value={health}
              onChange={(e) => setHealth(e.target.value)}
            >
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
            </select>

            <input
              type="number"
              className="border p-2 rounded"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              placeholder="Progress (0–100)"
            />
          </div>

          <input
            type="text"
            className="border p-2 rounded"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags (comma separated e.g. demo, frontend)"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditMode(false);
              }}
              className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className={`px-3 py-2 text-white rounded-lg transition ${
                saving || !hasChanges
                  ? "bg-gray-400"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}

      {/* Milestones, Activity, Team */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Milestones items={milestones} derivedPercent={milestonesPct} />
          <ActivityTimeline events={events} />
        </div>
        <div className="lg:col-span-1">
          <TeamRoster members={team} />
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
