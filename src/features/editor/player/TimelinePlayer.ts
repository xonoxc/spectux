export interface ClipSegment {
  clipId: string
  assetId: string
  type: 'video' | 'audio'
  timelineStart: number
  timelineEnd: number
  assetStart: number
  assetEnd: number
  muted: boolean
  volume: number
}

export function findSegment(
  segments: ClipSegment[],
  time: number,
): ClipSegment | null {
  return getClipAtTime(segments, time)
}

export function clipDuration(segment: ClipSegment): number {
  return segment.assetEnd - segment.assetStart
}

export function clipTimelineEnd(segment: ClipSegment): number {
  return segment.timelineStart + clipDuration(segment)
}

export function getClipAtTime(
  segments: ClipSegment[],
  time: number,
): ClipSegment | null {
  return (
    segments.find(
      (segment) =>
        time >= segment.timelineStart && time < clipTimelineEnd(segment),
    ) ?? null
  )
}

export function getActiveAudioClips(
  segments: ClipSegment[],
  time: number,
): ClipSegment[] {
  return segments.filter(
    (s) =>
      s.type === 'audio' &&
      time >= s.timelineStart &&
      time < clipTimelineEnd(s),
  )
}

export function getNextClipAfterTime(
  segments: ClipSegment[],
  time: number,
): ClipSegment | null {
  return (
    segments.find((segment) => segment.timelineStart >= time) ??
    segments.find((segment) => clipTimelineEnd(segment) > time) ??
    null
  )
}

export function assetToTimelineTime(
  seg: ClipSegment,
  assetTime: number,
): number {
  return seg.timelineStart + (assetTime - seg.assetStart)
}

export function timelineToAssetTime(
  seg: ClipSegment,
  timelineTime: number,
): number {
  return seg.assetStart + (timelineTime - seg.timelineStart)
}

export interface TimelinePlayerDeps {
  getSegments: () => ClipSegment[]
  loadAssetBlob: (assetId: string) => Promise<Blob | null>
  onTimelineTime: (time: number) => void
  onPlayState: (playing: boolean) => void
}

interface AudioHandle {
  element: HTMLAudioElement
  objectUrl: string
  assetId: string
  clipId: string
}

export class TimelinePlayer {
  private video: HTMLVideoElement
  private deps: TimelinePlayerDeps
  private playing = false
  private rafId: number | null = null
  private loading = false
  private currentSegment: ClipSegment | null = null
  private loadedAssetId: string | null = null
  private objectUrl: string | null = null
  private lastReportedTime = -1
  private timelineTime = 0
  private lastFrameTime: number | null = null
  private loadAssetId = 0

  private audioHandles = new Map<string, AudioHandle>()
  private pendingAudioLoads = new Map<string, Promise<void>>()

  constructor(video: HTMLVideoElement, deps: TimelinePlayerDeps) {
    this.video = video
    this.deps = deps
    this.video.addEventListener('play', this.onPlay)
    this.video.addEventListener('ended', this.onVideoEnded)
  }

  play(timelineTime: number) {
    const segments = this.deps.getSegments()
    if (segments.length === 0) return

    const videoSegments = segments.filter((s) => s.type === 'video')
    const segment = getClipAtTime(videoSegments, timelineTime)
    this.timelineTime = timelineTime
    this.playing = true
    this.deps.onPlayState(true)
    this.startedAudioClips.clear()
    if (segment) {
      this.ensureClipLoaded(segment, timelineTime)
    } else {
      this.currentSegment = null
      this.video.pause()
    }
    this.syncAudio(timelineTime)
    this.startLoop()
  }

  pause() {
    this.playing = false
    this.stopLoop()
    this.loading = false
    this.video.pause()
    this.pauseAllAudio()
    this.deps.onPlayState(false)
  }

  seek(timelineTime: number) {
    const segments = this.deps.getSegments()
    const videoSegments = segments.filter((s) => s.type === 'video')
    const segment = getClipAtTime(videoSegments, timelineTime)

    this.timelineTime = timelineTime
    this.lastFrameTime = null

    if (segment) {
      this.ensureClipLoaded(segment, timelineTime)
    } else {
      this.currentSegment = null
      this.video.pause()
    }

    this.startedAudioClips.clear()
    this.syncAudio(timelineTime)
    this.deps.onTimelineTime(timelineTime)
  }

  destroy() {
    this.pause()
    this.cleanupUrl()
    this.cleanupAllAudio()
    this.video.removeEventListener('play', this.onPlay)
    this.video.removeEventListener('ended', this.onVideoEnded)
    this.video.src = ''
    this.video.load()
  }

  private activeAudioClipIds = new Set<string>()
  private startedAudioClips = new Set<string>()

  private syncAudio(timelineTime: number) {
    const segments = this.deps.getSegments()
    const active = getActiveAudioClips(segments, timelineTime)
    const activeIds = new Set(active.map((s) => s.clipId))

    for (const clipId of this.activeAudioClipIds) {
      if (activeIds.has(clipId)) continue
      const handle = this.audioHandles.get(clipId)
      if (handle && !handle.element.paused) {
        handle.element.pause()
      }
      this.startedAudioClips.delete(clipId)
    }

    for (const segment of active) {
      const existing = this.audioHandles.get(segment.clipId)
      if (existing && existing.assetId === segment.assetId) {
        existing.element.volume = segment.muted ? 0 : segment.volume

        if (!this.startedAudioClips.has(segment.clipId)) {
          const assetTime = timelineToAssetTime(segment, timelineTime)
          existing.element.currentTime = assetTime
          this.startedAudioClips.add(segment.clipId)
          if (this.playing) {
            existing.element.play().catch(() => {})
          }
        }
      } else {
        if (existing) {
          existing.element.pause()
          URL.revokeObjectURL(existing.objectUrl)
          this.audioHandles.delete(segment.clipId)
        }
        this.startedAudioClips.delete(segment.clipId)
        this.loadAudio(segment)
      }
    }

    this.preloadUpcomingAudio(timelineTime, segments, activeIds)
    this.activeAudioClipIds = activeIds
  }

  private preloadUpcomingAudio(
    timelineTime: number,
    segments: ClipSegment[],
    activeIds: Set<string>,
  ) {
    const preloadWindow = 2
    for (const seg of segments) {
      if (seg.type !== 'audio') continue
      if (activeIds.has(seg.clipId)) continue
      if (this.audioHandles.has(seg.clipId)) continue
      if (seg.timelineStart > timelineTime + preloadWindow) continue
      if (clipTimelineEnd(seg) < timelineTime) continue
      this.loadAudio(seg)
    }
  }

  private loadAudio(segment: ClipSegment) {
    if (this.pendingAudioLoads.has(segment.clipId)) return

    const loadPromise = this.deps
      .loadAssetBlob(segment.assetId)
      .then((blob) => {
        if (!blob) return
        if (
          this.currentSegment?.clipId &&
          this.audioHandles.has(segment.clipId)
        ) {
          const existing = this.audioHandles.get(segment.clipId)
          if (existing && existing.clipId !== segment.clipId) return
        }

        const url = URL.createObjectURL(blob)
        const element = new Audio(url)
        element.volume = segment.muted ? 0 : segment.volume

        this.audioHandles.set(segment.clipId, {
          element,
          objectUrl: url,
          assetId: segment.assetId,
          clipId: segment.clipId,
        })

        element.addEventListener(
          'loadedmetadata',
          () => {
            if (
              this.currentSegment?.clipId &&
              !this.audioHandles.has(segment.clipId)
            )
              return

            const assetTime = timelineToAssetTime(segment, this.timelineTime)
            element.currentTime = assetTime

            if (this.playing) {
              element.play().catch(() => {})
            }
            this.startedAudioClips.add(segment.clipId)
          },
          { once: true },
        )
      })

    this.pendingAudioLoads.set(segment.clipId, loadPromise)
    loadPromise.finally(() => {
      this.pendingAudioLoads.delete(segment.clipId)
    })
  }

  private pauseAllAudio() {
    for (const [, handle] of this.audioHandles) {
      handle.element.pause()
    }
  }

  private cleanupAllAudio() {
    this.pauseAllAudio()
    for (const [, handle] of this.audioHandles) {
      URL.revokeObjectURL(handle.objectUrl)
    }
    this.audioHandles.clear()
    this.pendingAudioLoads.clear()
  }

  private ensureClipLoaded(segment: ClipSegment, timelineTime: number) {
    if (this.loadedAssetId === segment.assetId && this.objectUrl) {
      this.currentSegment = segment
      this.loading = false
      const assetTime = timelineToAssetTime(segment, timelineTime)
      if (Math.abs(this.video.currentTime - assetTime) > 0.1) {
        this.video.currentTime = assetTime
      }
      if (this.playing && this.video.paused) {
        this.video.play().catch(() => {})
      }
      if (this.playing) {
        this.startLoop()
      }
      return
    }

    this.loadAsset(segment)
  }

  private loadAsset(segment: ClipSegment) {
    this.currentSegment = segment
    this.cleanupUrl()
    this.loading = true
    this.loadedAssetId = null
    this.video.pause()

    const loadId = ++this.loadAssetId

    this.deps.loadAssetBlob(segment.assetId).then((blob) => {
      if (!blob) {
        this.loading = false
        this.finishPlayback()
        return
      }
      if (this.currentSegment?.clipId !== segment.clipId) return
      if (loadId !== this.loadAssetId) return

      const url = URL.createObjectURL(blob)
      this.objectUrl = url
      this.loadedAssetId = segment.assetId
      this.video.src = url
      this.video.load()

      this.video.addEventListener(
        'loadeddata',
        () => {
          this.loading = false
          if (this.currentSegment?.clipId !== segment.clipId) return
          if (loadId !== this.loadAssetId) return

          const activeTime = this.timelineTime
          const allSegments = this.deps.getSegments()
          const videoSegments = allSegments.filter((s) => s.type === 'video')
          const activeSegment = getClipAtTime(videoSegments, activeTime)
          if (activeSegment?.clipId !== segment.clipId) return

          const assetTime = timelineToAssetTime(segment, activeTime)
          this.video.currentTime = assetTime
          if (this.playing) {
            this.video.play().catch(() => {})
          }
        },
        { once: true },
      )
    })
  }

  private findNextVideoSegment(time: number): ClipSegment | null {
    const allSegments = this.deps.getSegments()
    const videoSegments = allSegments.filter((s) => s.type === 'video')
    return getNextClipAfterTime(videoSegments, time)
  }

  private advancePastCurrentClip() {
    const segment = this.currentSegment
    if (!segment) return false

    const clipEnd = clipTimelineEnd(segment)
    if (this.timelineTime < clipEnd) {
      this.updateTimelineTime(clipEnd)
    }

    const next = this.findNextVideoSegment(this.timelineTime)
    if (!next) {
      this.finishPlayback()
      return true
    }

    if (next.clipId !== segment.clipId) {
      this.updateTimelineTime(Math.max(this.timelineTime, next.timelineStart))
      this.ensureClipLoaded(next, this.timelineTime)
      return true
    }

    return false
  }

  private finishPlayback() {
    const segments = this.deps.getSegments()
    const hasActiveAudio = segments.some(
      (s) => s.type === 'audio' && s.timelineEnd > this.timelineTime,
    )
    if (hasActiveAudio) {
      this.currentSegment = null
      this.video.pause()
      if (this.playing) this.startLoop()
      return
    }

    this.playing = false
    this.loading = false
    this.lastFrameTime = null
    this.video.pause()
    this.pauseAllAudio()
    this.stopLoop()
    this.deps.onPlayState(false)
  }

  private updateTimelineTime(time: number) {
    this.timelineTime = time
    if (Math.abs(time - this.lastReportedTime) > 0.02) {
      this.lastReportedTime = time
      this.deps.onTimelineTime(time)
    }
  }

  private tick = (frameTime: number) => {
    if (!this.playing) return

    if (this.loading) {
      this.lastFrameTime = frameTime
      this.rafId = requestAnimationFrame(this.tick)
      return
    }

    if (this.lastFrameTime === null) {
      this.lastFrameTime = frameTime
    }

    const delta = Math.max(0, (frameTime - this.lastFrameTime) / 1000)
    this.lastFrameTime = frameTime
    this.updateTimelineTime(this.timelineTime + delta)

    const allSegments = this.deps.getSegments()
    const videoSegments = allSegments.filter((s) => s.type === 'video')

    const currentVideoSegment = this.currentSegment
    if (
      currentVideoSegment &&
      this.timelineTime >= clipTimelineEnd(currentVideoSegment)
    ) {
      if (this.advancePastCurrentClip()) {
        this.syncAudio(this.timelineTime)
        this.rafId = requestAnimationFrame(this.tick)
        return
      }
    }

    const segment = getClipAtTime(videoSegments, this.timelineTime)
    if (!segment) {
      const next = this.findNextVideoSegment(this.timelineTime)
      if (!next && !currentVideoSegment) {
        this.finishPlayback()
        return
      }

      this.currentSegment = null
      this.video.pause()
      this.syncAudio(this.timelineTime)
      this.rafId = requestAnimationFrame(this.tick)
      return
    }

    if (this.currentSegment?.clipId !== segment.clipId) {
      this.ensureClipLoaded(segment, this.timelineTime)
    }

    if (this.loadedAssetId === segment.assetId && this.objectUrl) {
      const assetTime = timelineToAssetTime(segment, this.timelineTime)
      if (Math.abs(this.video.currentTime - assetTime) > 0.15) {
        this.video.currentTime = assetTime
      }
      if (this.video.paused) {
        this.video.play().catch(() => {})
      }
    }

    this.syncAudio(this.timelineTime)
    this.rafId = requestAnimationFrame(this.tick)
  }

  private startLoop() {
    if (this.rafId !== null) return
    this.lastFrameTime = null
    this.lastReportedTime = -1
    this.rafId = requestAnimationFrame(this.tick)
  }

  private stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private cleanupUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = null
    }
  }

  private onPlay = () => {
    if (!this.playing) {
      this.playing = true
      this.deps.onPlayState(true)
      this.startLoop()
    }
  }

  private onVideoEnded = () => {
    if (!this.playing) {
      return
    }

    if (this.advancePastCurrentClip()) {
      this.syncAudio(this.timelineTime)
      this.startLoop()
    }
  }
}
