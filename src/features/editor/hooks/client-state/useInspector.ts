import { useProjectStore } from '#/features/editor/store/project.store'
import { findClip } from '~'

export function useInspectorPanel() {
  const project = useProjectStore((s) => s.project)
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds)
  const inspectedAssetId = useProjectStore((s) => s.inspectedAssetId)
  const closeInspector = useProjectStore((s) => s.closeInspector)

  const selectedClip =
    selectedClipIds.length === 1
      ? findClip(project.timeline, selectedClipIds[0])
      : null

  const inspectedAsset = inspectedAssetId
    ? (project.assets.find((a) => a.id === inspectedAssetId) ?? null)
    : null

  return {
    project,
    selectedClipIds,
    inspectedAssetId,
    closeInspector,
    selectedClip,
    inspectedAsset,
  }
}
