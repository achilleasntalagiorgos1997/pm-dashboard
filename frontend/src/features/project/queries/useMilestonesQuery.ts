import { useQuery } from "@tanstack/react-query";
import { getMilestones } from "../api/projects";
import type { Milestone } from "../types/project";

export function useMilestonesQuery(id?: number) {
  return useQuery<Milestone[]>({
    queryKey: ["milestones", id],
    queryFn: () => getMilestones(id!),
    enabled: !!id,
  });
}
