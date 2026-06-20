import { err, ok } from 'neverthrow'
import type { Result } from 'neverthrow'
import type { Project } from '../project/Project'
import { splitClipAt } from '../timeline/Clip'
import type { EditorError } from '../errors/errors'
import { findClip } from '../timeline/Timeline'

export function splitClip(
  project: Project,
  clipId: string,
  splitTime: number,
): Result<Project, EditorError> {
  const found = findClip(project.timeline, clipId)
  if (found.isErr()) {
    return err(found.error)
  }

  const { track, clip } = found.value
  const splitResult = splitClipAt(clip, splitTime)
  if (splitResult.isErr()) {
    return err(splitResult.error)
  }

  const [left, right] = splitResult.value

  const updatedTrack = track.clips
    .filter((c) => c.id !== clipId)
    .concat([left, right])
    .sort((a, b) => a.timelineStart - b.timelineStart)

  const newTracks = project.timeline.tracks.map((t) =>
    t.id === track.id ? { ...t, clips: updatedTrack } : t,
  )

  return ok({
    ...project,
    timeline: { ...project.timeline, tracks: newTracks },
  })
}

export function canSplitAt(
  project: Project,
  clipId: string,
  splitTime: number,
): boolean {
  const found = findClip(project.timeline, clipId)
  if (found.isErr()) return false

  const { clip } = found.value
  const result = splitClipAt(clip, splitTime)
  return result.isOk()
}
