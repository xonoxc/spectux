import { ClipItem } from './ClipItem'
import { clipEndTime } from '~'
import { useTrackRow } from '#/features/editor/hooks/client-state/useTrackRow'
import { cn } from 'shared/utils/cn'

import type { TrackRowProps } from '#/features/editor/hooks/client-state/useTrackRow'

const JOIN_TOLERANCE = 0.01

export function TrackRow(props: TrackRowProps) {
  const {
    track,
    bgClass,
    handleRowClick,
    handleDrop,
    handleDragLeave,
    rowRef,
    handleDragOver,
    assetMap,
    isAudio,
  } = useTrackRow(props)

  const sortedClips = [...track.clips].sort(
    (a, b) => a.timelineStart - b.timelineStart,
  )

  const joinedSet = new Set<string>()
  for (let i = 0; i < sortedClips.length - 1; i++) {
    const cur = sortedClips[i]
    const next = sortedClips[i + 1]
    const curEnd = clipEndTime(cur)
    if (Math.abs(curEnd - next.timelineStart) <= JOIN_TOLERANCE) {
      joinedSet.add(cur.id)
    }
  }

  return (
    <div
      ref={rowRef}
      data-track-id={track.id}
      className={cn(
        'relative border-b border-neutral-800 transition-colors',
        bgClass,
      )}
      style={{
        height: props.trackHeight,
      }}
      onClick={handleRowClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="absolute left-0 top-0 flex h-full w-30 items-center border-r border-neutral-800 bg-neutral-900 px-2"
        style={{ marginLeft: -120 }}
      >
        <span
          className={cn(
            'truncate text-[10px] font-medium uppercase',
            isAudio ? 'text-emerald-500' : 'text-neutral-500',
          )}
        >
          {isAudio ? `A${props.trackIndex + 1}` : `V${props.trackIndex + 1}`}
        </span>
      </div>

      {track.clips.map((clip) => (
        <ClipItem
          key={clip.id}
          clip={clip}
          assetName={assetMap.get(clip.assetId)?.name ?? clip.id.slice(0, 6)}
          pixelsPerSecond={props.pixelsPerSecond}
          trackHeight={props.trackHeight}
          isSelected={props.selectedClipIds.includes(clip.id)}
          zoom={props.zoom}
          trackId={track.id}
          joinedToNext={joinedSet.has(clip.id)}
        />
      ))}
    </div>
  )
}
