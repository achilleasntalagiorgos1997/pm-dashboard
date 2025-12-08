import { useQuery } from "@tanstack/react-query";
import { getEvents } from "../api/projects";
import type { EventItem } from "../types/project";

export function useEventsQuery(id?: number) {
  return useQuery<EventItem[]>({
    queryKey: ["events", id],
    queryFn: async () => {
      const events = await getEvents(id!);
      return events
        .slice()
        .sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    },
    enabled: !!id,
  });
}
