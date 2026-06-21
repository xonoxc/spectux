import { err, ok } from 'neverthrow'
import type { Result } from 'neverthrow'
import type { Project } from '../project/Project'
import { moveClip } from '../timeline/Clip'
import type { EditorError } from '../errors/errors'
import { findClip } from '../timeline/Timeline'
import { hasOverlap } from '../timeline/Track'

export function moveClipToTime(
  project: Project,
  clipId: string,
  newTimelineStart: number,
): Result<Project, EditorError> {
  const found = findClip(project.timeline, clipId)
  if (found.isErr()) {
    return err(found.error)
  }

  const { track, clip } = found.value
  const movedResult = moveClip(clip, newTimelineStart)
  if (movedResult.isErr()) {
    return err(movedResult.error)
  }

  const movedClip = movedResult.value

  const otherClips = track.clips.filter((c) => c.id !== clipId)
  const tempTrack = { ...track, clips: [...otherClips, movedClip] }

  if (hasOverlap(tempTrack, movedClip)) {
    return err({
      type: 'TIMELINE.OVERLAP_DETECTED',
      clipId: clipId,
      trackId: track.id,
    })
  }

  const updatedClips = [...otherClips, movedClip].sort(
    (a, b) => a.timelineStart - b.timelineStart,
  )

  const newTracks = project.timeline.tracks.map((t) =>
    t.id === track.id ? { ...t, clips: updatedClips } : t,
  )

  return ok({
    ...project,
    timeline: { ...project.timeline, tracks: newTracks },
  })
}

export function moveClipToTrack(
  project: Project,
  clipId: string,
  targetTrackId: string,
  newTimelineStart: number,
): Result<Project, EditorError> {
  const found = findClip(project.timeline, clipId)
  if (found.isErr()) {
    return err(found.error)
  }

  const { track: sourceTrack, clip } = found.value
  const targetTrack = project.timeline.tracks.find(
    (t) => t.id === targetTrackId,
  )
  if (!targetTrack) {
    return err({
      type: 'TIMELINE.TRACK_NOT_FOUND',
      trackId: targetTrackId,
    })
  }

  const movedResult = moveClip(clip, newTimelineStart)
  if (movedResult.isErr()) {
    return err(movedResult.error)
  }

  const movedClip = movedResult.value

  if (hasOverlap(targetTrack, movedClip)) {
    return err({
      type: 'TIMELINE.OVERLAP_DETECTED',
      clipId: clipId,
      trackId: targetTrackId,
    })
  }

  const newTracks = project.timeline.tracks.map((t) => {
    if (t.id === sourceTrack.id) {
      return {
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      }
    }

    if (t.id === targetTrackId) {
      return {
        ...t,
        clips: [...t.clips, movedClip].sort(
          (a, b) => a.timelineStart - b.timelineStart,
        ),
      }
    }
    return t
  })

  return ok({
    ...project,
    timeline: {
      ...project.timeline,
      tracks: newTracks,
    },
  })
}
