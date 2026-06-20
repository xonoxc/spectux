export interface ClipSegment {
  clipId: string
  assetId: string
  timelineStart: number
  timelineEnd: number
  assetStart: number
  assetEnd: number
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

  constructor(video: HTMLVideoElement, deps: TimelinePlayerDeps) {
    this.video = video
    this.deps = deps
    this.video.addEventListener('play', this.onPlay)
    this.video.addEventListener('ended', this.onVideoEnded)
  }

  play(timelineTime: number) {
    const segments = this.deps.getSegments()
    const segment = getClipAtTime(segments, timelineTime)
    const nextSegment = segment ?? this.findNextSegment(timelineTime)
    if (!nextSegment) return

    this.timelineTime = timelineTime
    this.playing = true
    this.deps.onPlayState(true)
    if (segment) {
      this.ensureClipLoaded(segment, timelineTime)
    } else {
      this.currentSegment = null
      this.video.pause()
    }
    this.startLoop()
  }

  pause() {
    this.playing = false
    this.stopLoop()
    this.loading = false
    this.video.pause()
    this.deps.onPlayState(false)
  }

  seek(timelineTime: number) {
    const segments = this.deps.getSegments()
    const segment = getClipAtTime(segments, timelineTime)

    this.timelineTime = timelineTime
    this.lastFrameTime = null

    if (segment) {
      this.ensureClipLoaded(segment, timelineTime)
    } else {
      this.currentSegment = null
      this.video.pause()
    }

    this.deps.onTimelineTime(timelineTime)
  }

  destroy() {
    this.pause()
    this.cleanupUrl()
    this.video.removeEventListener('play', this.onPlay)
    this.video.removeEventListener('ended', this.onVideoEnded)
    this.video.src = ''
    this.video.load()
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
          const activeSegment = getClipAtTime(
            this.deps.getSegments(),
            activeTime,
          )
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

  private findNextSegment(time: number): ClipSegment | null {
    return getNextClipAfterTime(this.deps.getSegments(), time)
  }

  private advancePastCurrentClip() {
    const segment = this.currentSegment
    if (!segment) return false

    const clipEnd = clipTimelineEnd(segment)
    if (this.timelineTime < clipEnd) {
      this.updateTimelineTime(clipEnd)
    }

    const next = this.findNextSegment(this.timelineTime)
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
    this.playing = false
    this.loading = false
    this.lastFrameTime = null
    this.video.pause()
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

    const currentSegment = this.currentSegment
    if (
      currentSegment &&
      this.timelineTime >= clipTimelineEnd(currentSegment)
    ) {
      if (this.advancePastCurrentClip()) {
        this.rafId = requestAnimationFrame(this.tick)
        return
      }
    }

    const segment = getClipAtTime(this.deps.getSegments(), this.timelineTime)
    if (!segment) {
      const next = this.findNextSegment(this.timelineTime)
      if (!next) {
        this.finishPlayback()
        return
      }

      this.currentSegment = null
      this.video.pause()
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
    if (!this.playing) return
    if (this.advancePastCurrentClip()) {
      this.startLoop()
    }
  }
}
