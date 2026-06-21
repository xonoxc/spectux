import { err, ok } from "neverthrow"
import type { Result } from "neverthrow"
import type { Command } from "./Command"
import type { Project } from "../project/Project"
import type { EditorError } from "../errors/errors"
import type { EditorEvent } from "../events/EditorEvent"
import { findClip } from "../timeline/Timeline"

interface MuteClipCommandPayload {
   clipId: string
   muted: boolean
}

export function createMuteClipCommand(payload: MuteClipCommandPayload): Command {
   let previousProject: Project | null = null

   return {
      type: "MUTE_CLIP",

      execute(project: Project): Result<Project, EditorError> {
         previousProject = structuredClone(project)

         const found = findClip(project.timeline, payload.clipId)
         if (found.isErr()) return err(found.error)

         const { track } = found.value

         const newTracks = project.timeline.tracks.map(t =>
            t.id === track.id
               ? {
                    ...t,
                    clips: t.clips.map(c =>
                       c.id === payload.clipId ? { ...c, muted: payload.muted } : c
                    ),
                 }
               : t
         )

         return ok({
            ...project,
            timeline: { ...project.timeline, tracks: newTracks },
         })
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

      emitEvent(_prev: Project, _next: Project): EditorEvent | null {
         return null
      },
   }
}
