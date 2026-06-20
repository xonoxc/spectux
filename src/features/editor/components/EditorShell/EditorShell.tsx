import { TopBar } from './TopBar'
import { TimelinePanel } from '../Timeline/TimelinePanel'
import { ViewerPanel } from '../Preview/ViewerPanel'
import { MediaPanel } from '../MediaBin/MediaPanel'
import { InspectorPanel } from '../Inspector/InspectorPanel'
import { useProjectStore } from '../../store/project.store'

export function EditorShell() {
  const hasSelection = useProjectStore(
    (s) => s.selectedClipIds.length > 0 || s.inspectedAssetId !== null,
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <TopBar />

      <div className="flex shrink-0 overflow-hidden" style={{ height: '55%' }}>
        <div className="flex flex-1 flex-col overflow-hidden border-r border-neutral-800">
          <ViewerPanel />
        </div>
        <div className="flex border-l border-neutral-800">
          <div className="flex w-72 flex-col overflow-hidden">
            <MediaPanel />
          </div>
          {hasSelection && (
            <div className="w-64 shrink-0 overflow-y-auto border-l border-neutral-800">
              <InspectorPanel />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden border-t border-neutral-800">
        <TimelinePanel />
      </div>
    </div>
  )
}
