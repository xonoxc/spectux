import { useRef } from 'react'
import { useProjectStore } from '../../store/project.store'
import { TimeRuler } from './TimeRuler'
import { Playhead } from './Playhead'
import { TrackRow } from './TrackRow'
import { Scissors, MousePointer2, MoveHorizontal } from 'lucide-react'

const TRACK_HEIGHT = 48
const HEADER_WIDTH = 120

export function TimelinePanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const project = useProjectStore((s) => s.project)
  const zoom = useProjectStore((s) => s.zoom)
  const currentTime = useProjectStore((s) => s.currentTime)
  const selectedTool = useProjectStore((s) => s.selectedTool)
  const setSelectedTool = useProjectStore((s) => s.setSelectedTool)
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime)
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds)

  const duration = useProjectStore((s) => {
    const tracks = s.project.timeline.tracks
    if (tracks.length === 0) return 10
    return Math.max(
      ...tracks.map((t) => {
        if (t.clips.length === 0) return 0
        return Math.max(
          ...t.clips.map((c) => c.timelineStart + (c.end - c.start)),
        )
      }),
      10,
    )
  })

  const pixelsPerSecond = zoom
  const totalWidth = duration * pixelsPerSecond + 200

  const playheadX = currentTime * pixelsPerSecond

  function handleTimelineClick(e: React.MouseEvent) {
    if (selectedTool === 'cut') return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0
    const x = e.clientX - rect.left + scrollLeft - HEADER_WIDTH
    const time = Math.max(0, x / pixelsPerSecond)
    setCurrentTime(Math.min(time, duration))
  }

  const tools = [
    { id: 'select' as const, icon: MousePointer2, label: 'Select' },
    { id: 'cut' as const, icon: Scissors, label: 'Cut' },
    { id: 'trim' as const, icon: MoveHorizontal, label: 'Trim' },
  ]

  return (
    <div className="flex h-full flex-col bg-neutral-950">
      <div className="flex items-center gap-1 border-b border-neutral-800 px-2 py-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className={`rounded p-1 ${
              selectedTool === tool.id
                ? 'bg-neutral-700 text-neutral-100'
                : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
            }`}
            title={tool.label}
          >
            <tool.icon size={14} />
          </button>
        ))}
        <div className="mx-2 h-4 w-px bg-neutral-800" />
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>Zoom</span>
          <input
            type="range"
            min={10}
            max={200}
            value={zoom}
            onChange={(e) =>
              useProjectStore.getState().setZoom(Number(e.target.value))
            }
            className="h-1 w-20 appearance-none rounded bg-neutral-700 accent-blue-500"
          />
          <span className="w-8">{zoom}%</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div
          ref={containerRef}
          className="relative"
          style={{ width: totalWidth + HEADER_WIDTH, minWidth: '100%' }}
        >
          <div style={{ marginLeft: HEADER_WIDTH }}>
            <TimeRuler duration={duration} pixelsPerSecond={pixelsPerSecond} />
          </div>

          <div
            className="relative"
            style={{ marginLeft: HEADER_WIDTH }}
            onClick={handleTimelineClick}
          >
            <Playhead position={playheadX} />

            {project.timeline.tracks.length === 0 && (
              <div className="flex h-20 items-center justify-center text-xs text-neutral-600">
                Drag media here to create a track
              </div>
            )}

            {project.timeline.tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                trackIndex={index}
                pixelsPerSecond={pixelsPerSecond}
                trackHeight={TRACK_HEIGHT}
                selectedClipIds={selectedClipIds}
                zoom={zoom}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
