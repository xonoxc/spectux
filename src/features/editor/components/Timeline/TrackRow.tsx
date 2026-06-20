import { useCallback, useRef, useState, useMemo } from 'react'
import type { Track as TrackModel, Asset } from '~'
import { ClipItem } from './ClipItem'
import { useProjectStore } from '../../store/project.store'
import { addClip } from '~'
import { ok } from 'neverthrow'
import { nanoid } from 'nanoid'

interface TrackRowProps {
  track: TrackModel
  trackIndex: number
  pixelsPerSecond: number
  trackHeight: number
  selectedClipIds: string[]
  zoom: number
}

export function TrackRow({
  track,
  trackIndex,
  pixelsPerSecond,
  trackHeight,
  selectedClipIds,
  zoom,
}: TrackRowProps) {
  const assets = useProjectStore((s) => s.project.assets)
  const assetMap = useMemo(() => {
    const map = new Map<string, Asset>()
    for (const a of assets) map.set(a.id, a)
    return map
  }, [assets])
  const rowRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const isAudio = track.type === 'audio'

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const data = e.dataTransfer.getData('application/x-spectux-asset')
      if (!data) return

      const { assetId, duration: assetDuration } = JSON.parse(data)
      const rowRect = rowRef.current?.getBoundingClientRect()
      const scrollContainer = rowRef.current?.closest('.overflow-auto')
      const scrollLeft = scrollContainer?.scrollLeft ?? 0

      if (!rowRect) return

      const x = e.clientX - rowRect.left + scrollLeft
      const timelineStart = Math.max(0, x / pixelsPerSecond)

      const clipId = nanoid()
      const clip = {
        id: clipId,
        assetId,
        type: isAudio ? 'audio' as const : 'video' as const,
        start: 0,
        end: Math.min(assetDuration, 30),
        timelineStart,
        muted: false,
        volume: 1,
        effects: [],
      }

      const store = useProjectStore.getState()
      const result = addClip(track, clip)

      if (result.isOk()) {
        store.executeCommand({
          type: 'ADD_CLIP',
          execute(p) {
            const newTracks = p.timeline.tracks.map((t) =>
              t.id === track.id
                ? {
                    ...t,
                    clips: [...t.clips, clip].sort(
                      (a, b) => a.timelineStart - b.timelineStart,
                    ),
                  }
                : t,
            )
            return ok({
              ...p,
              timeline: { ...p.timeline, tracks: newTracks },
              updatedAt: Date.now(),
            })
          },
          undo(p) {
            const newTracks = p.timeline.tracks.map((t) =>
              t.id === track.id
                ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
                : t,
            )
            return ok({
              ...p,
              timeline: { ...p.timeline, tracks: newTracks },
              updatedAt: Date.now(),
            })
          },
          emitEvent() {
            return { type: 'CLIP_ADDED', clip, trackId: track.id } as const
          },
        })
      }
    },
    [track, pixelsPerSecond, isAudio],
  )

  const handleRowClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-clip-id]')) return
    useProjectStore.getState().selectClip(null)
  }, [])

  const bgClass = isDragOver
    ? isAudio ? 'bg-emerald-950/30' : 'bg-blue-950/30'
    : isAudio
      ? 'bg-neutral-950/80'
      : 'bg-neutral-950'

  return (
    <div
      ref={rowRef}
      data-track-id={track.id}
      className={`relative border-b border-neutral-800 transition-colors ${bgClass}`}
      style={{ height: trackHeight }}
      onClick={handleRowClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="absolute left-0 top-0 flex h-full w-[120px] items-center border-r border-neutral-800 bg-neutral-900 px-2"
        style={{ marginLeft: -120 }}
      >
        <span className={`truncate text-[10px] font-medium uppercase ${isAudio ? 'text-emerald-500' : 'text-neutral-500'}`}>
          {isAudio ? `A${trackIndex + 1}` : `V${trackIndex + 1}`}
        </span>
      </div>

      {track.clips.map((clip) => (
        <ClipItem
          key={clip.id}
          clip={clip}
          assetName={assetMap.get(clip.assetId)?.name ?? clip.id.slice(0, 6)}
          pixelsPerSecond={pixelsPerSecond}
          trackHeight={trackHeight}
          isSelected={selectedClipIds.includes(clip.id)}
          zoom={zoom}
          trackId={track.id}
        />
      ))}
    </div>
  )
}
