import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listProjects, saveProject, loadProject } from '../store/db'
import type { Project } from '#/../packages/editor-core/src'

const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: listProjects,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => loadProject(id),
    enabled: !!id,
  })
}

export function useSaveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (project: Project) => {
      await saveProject(project)
      return project
    },
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project)
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}
