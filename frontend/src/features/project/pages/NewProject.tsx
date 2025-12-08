import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL, http } from "../../../shared/api/api";
import { toTagArray } from "../utils/tags";

const NewProject = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("active");
  const [health, setHealth] = useState("green");
  const [tagsInput, setTagsInput] = useState(""); // text field
  const [progress, setProgress] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title,
        description,
        owner,
        status,
        health,
        // IMPORTANT: backend expects list[str]
        tags: toTagArray(tagsInput),
        progress: Number(progress) || 0,
      };

      const res = await fetch(`${BASE_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = `Failed to create project (HTTP ${res.status})`;
        try {
          const errData = await res.json();
          // Support FastAPI error format
          if (Array.isArray(errData?.detail)) {
            message =
              errData.detail
                .map((d: any) => d.msg || d.detail || JSON.stringify(d))
                .join("; ") || message;
          } else if (errData?.detail) {
            message =
              typeof errData.detail === "string"
                ? errData.detail
                : JSON.stringify(errData.detail);
          }
        } catch {
          /* ignore parse errors */
        }
        throw new Error(message);
      }

      // const created = await res.json();
      navigate("/");
    } catch (err: any) {
      setError(
        err.message || "Something went wrong while creating the project."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Link to="/" className="text-blue-500 underline mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-4">Add New Project</h1>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <input
          type="text"
          placeholder="Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="active">Active</option>
          <option value="planning">Planning</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={health}
          onChange={(e) => setHealth(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="green">Green</option>
          <option value="yellow">Yellow</option>
          <option value="red">Red</option>
        </select>

        <input
          type="text"
          placeholder="Tags (comma or space separated, e.g. demo frontend)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="border p-2 rounded"
        />

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Progress (0–100)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="border p-2 rounded w-full"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`px-4 py-2 text-white rounded transition ${
            submitting ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {submitting ? "Adding..." : "Add Project"}
        </button>
      </form>
    </div>
  );
};

export default NewProject;
