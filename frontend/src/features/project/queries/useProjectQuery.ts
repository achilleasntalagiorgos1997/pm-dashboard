import { useQuery } from "@tanstack/react-query";
import { getProject } from "../api/projects";
import type { Project } from "../types/project";

export function useProjectQuery(id?: number) {
  return useQuery<Project | null>({
    queryKey: ["project", id],
    queryFn: () => getProject(id!), // will only run when id is defined
    enabled: !!id, // don't run if id is undefined
  });
}
