import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProject } from "../api/projects";
import type { Project } from "../types/project";

export function useUpdateProjectMutation(id?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<Omit<Project, "id">>) =>
      updateProject(id!, payload),

    onSuccess: (updatedProject) => {
      // update cached project
      queryClient.setQueryData(["project", id], updatedProject);
    },
  });
}
