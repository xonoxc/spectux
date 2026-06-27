import { useState } from 'react'
import { useActorRef } from '@xstate/react'
import { TopBar } from './TopBar'
import { ExportDialog } from '../Export/ExportDialog'
import { TimelinePanel } from '../Timeline/TimelinePanel'
import { ViewerPanel } from '../Preview/ViewerPanel'
import { MediaPanel } from '../MediaBin/MediaPanel'
import { InspectorPanel } from '../Inspector/InspectorPanel'
import { useProjectStore } from '../../store/project.store'
import { exportMachine } from '../../machines/export.machine'
import { X } from 'lucide-react'

export function EditorShell() {
  const exportActor = useActorRef(exportMachine)
  const [showMobilePanel, setShowMobilePanel] = useState<'media' | 'inspector' | null>(null)

  const hasSelection = useProjectStore(
    (s) => s.selectedClipIds.length > 0 || s.inspectedAssetId !== null,
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <TopBar
        actor={exportActor}
        onToggleMedia={() => setShowMobilePanel(p => p === 'media' ? null : 'media')}
        onToggleInspector={() => setShowMobilePanel(p => p === 'inspector' ? null : 'inspector')}
        showMobileMediaPanel={showMobilePanel === 'media'}
        showMobileInspectorPanel={showMobilePanel === 'inspector'}
        hasSelection={hasSelection}
      />
      <ExportDialog actor={exportActor} />

      {/* Top section: viewer + desktop side panels */}
      <div className="flex shrink-0 flex-col overflow-hidden md:h-[55%] md:flex-row">
        <div className="flex flex-1 flex-col overflow-hidden border-neutral-800 md:border-r">
          <ViewerPanel />
        </div>
        <div className="hidden border-neutral-800 md:flex">
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

      {/* Mobile overlay panels */}
      {showMobilePanel && (
        <div className="fixed inset-0 top-10 z-40 bg-neutral-950 md:hidden">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                {showMobilePanel === 'media' ? 'Media' : 'Inspector'}
              </span>
              <button
                onClick={() => setShowMobilePanel(null)}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {showMobilePanel === 'media' ? <MediaPanel /> : <InspectorPanel />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
