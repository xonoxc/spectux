import { err, ok } from 'neverthrow'
import type { Result } from 'neverthrow'
import type { Command } from './Command'
import type { Project } from '../project/Project'
import type { EditorError } from '../errors/errors'
import type { EditorEvent } from '../events/EditorEvent'
import { moveClipToTime, moveClipToTrack } from '../operations/moveClip'
import { findClip } from '../timeline/Timeline'

interface MoveClipCommandPayload {
  clipId: string
  newTimelineStart: number
  targetTrackId?: string
}

export function createMoveClipCommand(
  payload: MoveClipCommandPayload,
): Command {
  let previousProject: Project | null = null
  let previousTimelineStart = 0

  return {
    type: 'MOVE_CLIP',

    execute(project: Project): Result<Project, EditorError> {
      previousProject = structuredClone(project)

      const found = findClip(project.timeline, payload.clipId)
      if (found.isOk()) {
        previousTimelineStart = found.value.clip.timelineStart
      }

      if (payload.targetTrackId) {
        return moveClipToTrack(
          project,
          payload.clipId,
          payload.targetTrackId,
          payload.newTimelineStart,
        )
      }

      return moveClipToTime(project, payload.clipId, payload.newTimelineStart)
    },

    undo(_project: Project): Result<Project, EditorError> {
      if (!previousProject) {
        return err({
          type: 'COMMAND.INVALID_STATE',
          reason: 'No snapshot for undo',
        })
      }
      return ok(structuredClone(previousProject))
    },

    emitEvent(_prev: Project, next: Project): EditorEvent | null {
      const found = findClip(next.timeline, payload.clipId)
      if (found.isErr()) return null
      return {
        type: 'CLIP_MOVED',
        clipId: payload.clipId,
        oldTimelineStart: previousTimelineStart,
        newTimelineStart: found.value.clip.timelineStart,
      }
    },
  }
}
