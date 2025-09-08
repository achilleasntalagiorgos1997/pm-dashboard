import React from "react";
import { Milestone } from "../types/project";

type Props = {
  items: Milestone[];
  derivedPercent: number | null; // null if no milestones
};

const Milestones: React.FC<Props> = ({ items, derivedPercent }) => {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">Milestones</h2>
        <div className="text-sm text-gray-600">
          {derivedPercent === null
            ? "No milestones"
            : `Derived progress: ${derivedPercent}%`}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-gray-500 text-sm">No milestones yet.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={m.done}
                readOnly
              />
              <span className={m.done ? "line-through text-gray-500" : ""}>
                {m.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Milestones;
