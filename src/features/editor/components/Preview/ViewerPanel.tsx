import { Play, Pause } from 'lucide-react'
import { useViewerPanel } from '#/features/editor/hooks/client-state/useViewerPanel'

export function ViewerPanel() {
  const {
    formatTime,
    handleSeek,
    videoRef,
    hasVideo,
    togglePlay,
    isPlaying,
    totalDuration,
    currentTime,
  } = useViewerPanel()

  return (
    <div className="flex flex-1 flex-col bg-neutral-950">
      <div className="flex flex-1 items-center justify-center bg-neutral-900">
        <div className="relative flex aspect-video w-full max-w-2xl items-center justify-center bg-black">
          <video
            ref={videoRef}
            className={`h-full w-full object-contain ${hasVideo ? '' : 'invisible'}`}
            playsInline
          />
          {!hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
              <p className="text-sm">Import a video to preview</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex h-12 items-center gap-3 border-t border-neutral-800 bg-neutral-900 px-4">
        <button
          onClick={togglePlay}
          className="rounded bg-neutral-800 p-1.5 text-neutral-200 hover:bg-neutral-700"
          disabled={!hasVideo}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <span className="font-mono text-xs text-neutral-400">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
        <div className="flex flex-1 items-center">
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.01}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded bg-neutral-700 accent-blue-500"
          />
        </div>
      </div>
    </div>
  )
}
