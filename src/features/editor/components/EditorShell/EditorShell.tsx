import { TopBar } from './TopBar'
import { TimelinePanel } from '../Timeline/TimelinePanel'
import { ViewerPanel } from '../Preview/ViewerPanel'
import { MediaPanel } from '../MediaBin/MediaPanel'
import { InspectorPanel } from '../Inspector/InspectorPanel'

export function EditorShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <TopBar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden border-b border-neutral-800">
          <div className="flex flex-1 flex-col overflow-hidden border-r border-neutral-800">
            <ViewerPanel />
          </div>
          <div className="flex w-72 flex-col overflow-hidden border-r border-neutral-800">
            <MediaPanel />
          </div>
          <div className="w-64 overflow-y-auto">
            <InspectorPanel />
          </div>
        </div>
        <div className="h-72 shrink-0">
          <TimelinePanel />
        </div>
      </div>
    </div>
  )
}
