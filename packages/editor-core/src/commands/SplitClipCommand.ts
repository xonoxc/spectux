import { err, ok } from "neverthrow"
import type { Result } from "neverthrow"
import type { Command } from "./Command"
import type { Project } from "../project/Project"
import type { EditorError } from "../errors/errors"
import type { EditorEvent } from "../events/EditorEvent"
import { splitClip } from "../operations/splitClip"
import { findClip } from "../timeline/Timeline"

interface SplitClipCommandPayload {
   clipId: string
   splitTime: number
}

export function createSplitClipCommand(payload: SplitClipCommandPayload): Command {
   let previousProject: Project | null = null

   return {
      type: "SPLIT_CLIP",

      execute(project: Project): Result<Project, EditorError> {
         previousProject = structuredClone(project)
         return splitClip(project, payload.clipId, payload.splitTime)
      },

      undo(_project: Project): Result<Project, EditorError> {
         if (!previousProject) {
            return err({
               type: "COMMAND.INVALID_STATE",
               reason: "No snapshot for undo",
            })
         }
         return ok(structuredClone(previousProject))
      },

      emitEvent(prev: Project, next: Project): EditorEvent | null {
         const found = findClip(next.timeline, payload.clipId)
         const prevFound = findClip(prev.timeline, payload.clipId)

         if (found.isErr() || prevFound.isErr()) return null

         const newClips = found.value.track.clips.filter(c => c.id.startsWith(payload.clipId))

         if (newClips.length < 2) return null

         return {
            type: "CLIP_SPLIT",
            clipId: payload.clipId,
            leftClip: newClips[0],
            rightClip: newClips[1],
         }
      },
   }
}
