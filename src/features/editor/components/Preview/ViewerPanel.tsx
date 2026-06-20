import { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '../../store/project.store'
import { loadAssetBlob } from '../../store/db'
import { clipEndTime } from '~'
import type { ClipSegment } from '../../player/TimelinePlayer'
import { TimelinePlayer, getClipAtTime } from '../../player/TimelinePlayer'
import { Play, Pause } from 'lucide-react'

function getSegments(): ClipSegment[] {
  const { project } = useProjectStore.getState()
  const segments: ClipSegment[] = []
  for (const track of project.timeline.tracks) {
    for (const clip of track.clips) {
      segments.push({
        clipId: clip.id,
        assetId: clip.assetId,
        timelineStart: clip.timelineStart,
        timelineEnd: clipEndTime(clip),
        assetStart: clip.start,
        assetEnd: clip.end,
      })
    }
  }
  segments.sort((a, b) => a.timelineStart - b.timelineStart)
  return segments
}

export function ViewerPanel() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<TimelinePlayer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const currentTime = useProjectStore((s) => s.currentTime)
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime)
  const clipCount = useProjectStore((s) =>
    s.project.timeline.tracks.reduce((sum, t) => sum + t.clips.length, 0),
  )
  const hasVideo = clipCount > 0
  const totalDuration = useProjectStore(() => {
    const segments = getSegments()
    return segments.length > 0 ? segments[segments.length - 1].timelineEnd : 0
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const player = new TimelinePlayer(video, {
      getSegments,
      loadAssetBlob,
      onTimelineTime(time) {
        setCurrentTime(time)
      },
      onPlayState(playing) {
        setIsPlaying(playing)
      },
    })

    playerRef.current = player

    return () => {
      player.destroy()
      playerRef.current = null
    }
  }, [setCurrentTime])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !hasVideo) return
    const segments = getSegments()
    if (segments.length === 0) return
    const segment = getClipAtTime(segments, currentTime)
    const seekTime = segment ? currentTime : segments[0].timelineStart
    if (seekTime !== currentTime) setCurrentTime(seekTime)
    player.seek(seekTime)
  }, [clipCount])

  const togglePlay = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    if (isPlaying) {
      player.pause()
    } else {
      player.play(currentTime)
    }
  }, [isPlaying, currentTime])

  const handleSeek = useCallback(
    (value: number) => {
      const player = playerRef.current
      if (player) player.seek(value)
      setCurrentTime(value)
    },
    [setCurrentTime],
  )

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    const ms = Math.floor((t % 1) * 100)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

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
