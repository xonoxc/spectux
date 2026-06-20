import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listProjectAssets, saveAssetBlob, loadAssetBlob } from '../store/db'
import type { Asset } from '~'

const assetKeys = {
  forProject: (projectId: string) => ['assets', 'project', projectId] as const,
  detail: (id: string) => ['assets', id] as const,
}

export function useProjectAssets(projectId: string) {
  return useQuery({
    queryKey: assetKeys.forProject(projectId),
    queryFn: () => listProjectAssets(projectId),
    enabled: !!projectId,
  })
}

export function useAssetBlob(assetId: string) {
  return useQuery({
    queryKey: assetKeys.detail(assetId),
    queryFn: () => loadAssetBlob(assetId),
    enabled: !!assetId,
  })
}

export function useImportAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      asset: Asset
      projectId: string
      blob: Blob
    }) => {
      await saveAssetBlob(params.asset, params.projectId, params.blob)
      return params.asset
    },
    onSuccess: (_asset, variables) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.forProject(variables.projectId),
      })
    },
  })
}
