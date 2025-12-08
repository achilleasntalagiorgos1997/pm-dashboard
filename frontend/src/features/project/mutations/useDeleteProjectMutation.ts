import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProject } from "../api/projects";

export function useDeleteProjectMutation(id?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteProject(id!),

    onSuccess: () => {
      // invalidate all project-related queries
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
