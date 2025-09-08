import React from "react";
import { TeamMember } from "../types/project";

const TeamRoster: React.FC<{ members: TeamMember[] }> = ({ members }) => {
  return (
    <div className="rounded-2xl border p-4">
      <h2 className="font-semibold text-lg mb-3">Team</h2>
      {members.length === 0 ? (
        <div className="text-sm text-gray-500">No team members yet.</div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-gray-600">{m.role}</div>
              </div>
              <div className="text-sm">
                Capacity:{" "}
                <span className="font-medium">
                  {Math.round(m.capacity * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamRoster;
