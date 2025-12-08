import { useQuery } from "@tanstack/react-query";
import { getTeam } from "../api/projects";
import type { TeamMember } from "../types/project";

export function useTeamQuery(id?: number) {
  return useQuery<TeamMember[]>({
    queryKey: ["team", id],
    queryFn: () => getTeam(id!),
    enabled: !!id,
  });
}
