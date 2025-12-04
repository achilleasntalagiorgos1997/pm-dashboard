import React from "react";
import { EventItem } from "../types/project";

const ActivityTimeline: React.FC<{ events: EventItem[] }> = ({ events }) => {
  return (
    <div className="rounded-2xl border p-4">
      <h2 className="font-semibold text-lg mb-3">Recent Activity</h2>
      {events.length === 0 ? (
        <div className="text-sm text-gray-500">No recent events.</div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3">
              <div className="h-2 w-2 mt-2 rounded-full bg-gray-400" />
              <div>
                <div className="text-sm text-gray-500">
                  {new Date(e.at).toLocaleString()}
                </div>
                <div className="font-medium">{e.kind}</div>
                <div className="text-sm">{e.message}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActivityTimeline;
