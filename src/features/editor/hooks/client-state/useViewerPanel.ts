import { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '../../store/project.store'
import { loadAssetBlob } from '../../store/db'
import { clipEndTime } from '~'
import type { ClipSegment } from '../../player/TimelinePlayer'
import { TimelinePlayer, getClipAtTime } from '../../player/TimelinePlayer'

export function useViewerPanel() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<TimelinePlayer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const currentTime = useProjectStore((s) => s.currentTime)
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime)
  const isExporting = useProjectStore((s) => s.isExporting)
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

  useEffect(() => {
    if (!isExporting) return
    const player = playerRef.current
    if (!player) return
    player.pause()
    player.seek(0)
    setCurrentTime(0)
  }, [isExporting, setCurrentTime])

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

  return {
    formatTime,
    handleSeek,
    videoRef,
    hasVideo,
    togglePlay,
    isPlaying,
    totalDuration,
    currentTime,
  }
}

export function getSegments(): ClipSegment[] {
  const { project } = useProjectStore.getState()

  const segments: ClipSegment[] = []
  for (const track of project.timeline.tracks) {
    for (const clip of track.clips)
      segments.push({
        clipId: clip.id,
        assetId: clip.assetId,
        type: clip.type,
        timelineStart: clip.timelineStart,
        timelineEnd: clipEndTime(clip),
        assetStart: clip.start,
        assetEnd: clip.end,
        muted: clip.muted,
        volume: clip.volume,
      })
  }

  segments.sort((a, b) => a.timelineStart - b.timelineStart)
  return segments
}
