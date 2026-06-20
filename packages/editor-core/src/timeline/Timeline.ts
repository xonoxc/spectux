import { err, ok } from 'neverthrow'
import type { Result } from 'neverthrow'
import { createTrack } from './Track'
import type { Track, TrackType } from './Track'
import type { Clip } from './Clip'
import type { EditorError } from '../errors/errors'

export interface Timeline {
  tracks: Track[]
}

export function createTimeline(): Timeline {
  return { tracks: [] }
}

export function addTrack(
  timeline: Timeline,
  type: TrackType,
  id: string,
): Result<Timeline, EditorError> {
  const track = createTrack({ id, type })
  return ok({
    ...timeline,
    tracks: [...timeline.tracks, track],
  })
}

export function removeTrack(
  timeline: Timeline,
  trackId: string,
): Result<Timeline, EditorError> {
  const idx = timeline.tracks.findIndex((t) => t.id === trackId)
  if (idx === -1) {
    return err({
      type: 'TIMELINE.TRACK_NOT_FOUND',
      trackId,
    })
  }

  return ok({
    ...timeline,
    tracks: timeline.tracks.filter((t) => t.id !== trackId),
  })
}

export function getTrack(
  timeline: Timeline,
  trackId: string,
): Result<Track, EditorError> {
  const track = timeline.tracks.find((t) => t.id === trackId)
  if (!track) {
    return err({
      type: 'TIMELINE.TRACK_NOT_FOUND',
      trackId,
    })
  }
  return ok(track)
}

export function totalDuration(timeline: Timeline): number {
  if (timeline.tracks.length === 0) return 0

  return Math.max(
    ...timeline.tracks.map((t) => {
      if (t.clips.length === 0) return 0
      return Math.max(
        ...t.clips.map((c) => c.timelineStart + (c.end - c.start)),
      )
    }),
  )
}

export function findClip(
  timeline: Timeline,
  clipId: string,
): Result<{ track: Track; clip: Clip }, EditorError> {
  for (const track of timeline.tracks) {
    const clip = track.clips.find((c) => c.id === clipId)
    if (clip) {
      return ok({ track, clip })
    }
  }

  return err({
    type: 'TIMELINE.CLIP_NOT_FOUND',
    clipId,
  })
}
