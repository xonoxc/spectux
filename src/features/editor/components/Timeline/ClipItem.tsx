import { Trash2, Volume2, VolumeX, Link2 } from 'lucide-react'
import { useClipItem } from '#/features/editor/hooks/client-state/useClipItem'

import type { ClipItemProps } from '#/features/editor/hooks/client-state/useClipItem'

const HANDLE_WIDTH = 6

export function ClipItem(props: ClipItemProps) {
  const {
    clip,
    isSelected,
    trackHeight,
    width,
    baseX,
    visualOffset,
    handleMouseDown,
    assetName,
    handleMute,
    handleTrimStart,
    handleTrimEnd,
    handleDelete,
    joinedToNext,
  } = useClipItem(props)

  return (
    <div
      data-clip-id={clip.id}
      className={`group absolute top-1 rounded border text-xs transition-shadow ${
        isSelected
          ? 'z-10 border-blue-500 bg-blue-900/40 shadow-lg shadow-blue-500/10'
          : clip.type === 'audio'
            ? 'z-0 border-emerald-700 bg-emerald-900/30 hover:border-emerald-600'
            : 'z-0 border-neutral-700 bg-neutral-800 hover:border-neutral-600'
      }`}
      style={{
        left: baseX,
        width: Math.max(width, 10),
        height: trackHeight - 8,
        cursor: 'grab',
        transform: `translateX(${visualOffset}px)`,
        willChange: visualOffset !== 0 ? 'transform' : undefined,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="absolute left-0 top-0 h-full cursor-col-resize hover:bg-blue-500/30"
        style={{ width: HANDLE_WIDTH }}
        onMouseDown={handleTrimStart}
      />
      <div className="flex h-full items-center gap-1 px-2">
        {clip.type === 'audio' && (
          <span className="flex items-center gap-0.5 text-emerald-400/50">
            {'▂▄▆█▆▄▂'.split('').map((ch, i) => (
              <span key={i} className="text-[6px] leading-none">
                {ch}
              </span>
            ))}
          </span>
        )}
        <span
          className={`truncate ${clip.type === 'audio' ? 'text-[10px] text-emerald-300/70' : 'text-[10px] text-neutral-300'}`}
        >
          {assetName}
        </span>
      </div>
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleMute}
          className="rounded bg-black/60 p-1 text-neutral-300 hover:bg-black/80"
          title={clip.muted ? 'Unmute' : 'Mute'}
          style={{ opacity: clip.muted ? 1 : undefined }}
        >
          {clip.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
        <button
          onClick={handleDelete}
          className="rounded bg-black/60 p-1 text-neutral-300 hover:bg-red-900/80 hover:text-red-100"
          title="Delete clip"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div
        className="absolute right-0 top-0 h-full cursor-col-resize hover:bg-blue-500/30"
        style={{ width: HANDLE_WIDTH }}
        onMouseDown={handleTrimEnd}
      />
      {joinedToNext && (
        <div
          className="absolute top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{ left: '100%' }}
          title="Joined clip"
        >
          <div className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-600 bg-neutral-800">
            <Link2 size={8} className="text-neutral-400" />
          </div>
        </div>
      )}
    </div>
  )
}
