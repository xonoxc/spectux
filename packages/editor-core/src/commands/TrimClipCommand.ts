import { err, ok } from 'neverthrow'
import type { Result } from 'neverthrow'
import type { Command } from './Command'
import type { Project } from '../project/Project'
import type { EditorError } from '../errors/errors'
import type { EditorEvent } from '../events/EditorEvent'
import { trimClipOperation } from '../operations/trimClip'
import { findClip } from '../timeline/Timeline'

interface TrimClipCommandPayload {
  clipId: string
  newStart: number
  newEnd: number
}

export function createTrimClipCommand(
  payload: TrimClipCommandPayload,
): Command {
  let previousProject: Project | null = null
  let previousStart = 0
  let previousEnd = 0

  return {
    type: 'TRIM_CLIP',

    execute(project: Project): Result<Project, EditorError> {
      previousProject = structuredClone(project)

      const found = findClip(project.timeline, payload.clipId)
      if (found.isOk()) {
        previousStart = found.value.clip.start
        previousEnd = found.value.clip.end
      }

      return trimClipOperation(
        project,
        payload.clipId,
        payload.newStart,
        payload.newEnd,
      )
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

    emitEvent(_prev: Project, _next: Project): EditorEvent | null {
      return {
        type: 'CLIP_TRIMMED',
        clipId: payload.clipId,
        oldStart: previousStart,
        oldEnd: previousEnd,
        newStart: payload.newStart,
        newEnd: payload.newEnd,
      }
    },
  }
}
