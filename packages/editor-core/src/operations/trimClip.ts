import { err, ok } from "neverthrow"
import type { Result } from "neverthrow"
import type { Project } from "../project/Project"
import { trimClip as trimClipFn } from "../timeline/Clip"
import type { EditorError } from "../errors/errors"
import { findClip } from "../timeline/Timeline"
import { hasOverlap } from "../timeline/Track"

export function trimClipOperation(
   project: Project,
   clipId: string,
   newStart: number,
   newEnd: number
): Result<Project, EditorError> {
   const found = findClip(project.timeline, clipId)
   if (found.isErr()) {
      return err(found.error)
   }

   const { track, clip } = found.value

   const trimResult = trimClipFn(clip, newStart, newEnd)
   if (trimResult.isErr()) {
      return err(trimResult.error)
   }

   const trimmedClip = trimResult.value

   const otherClips = track.clips.filter(c => c.id !== clipId)
   const tempTrack = {
      ...track,
      clips: [...otherClips, trimmedClip],
   }

   if (hasOverlap(tempTrack, trimmedClip))
      return err({
         type: "TIMELINE.OVERLAP_DETECTED",
         clipId: clipId,
         trackId: track.id,
      })

   const updatedClips = [...otherClips, trimmedClip].sort(
      (a, b) => a.timelineStart - b.timelineStart
   )

   const newTracks = project.timeline.tracks.map(t =>
      t.id === track.id
         ? {
              ...t,
              clips: updatedClips,
           }
         : t
   )

   return ok({
      ...project,
      timeline: {
         ...project.timeline,
         tracks: newTracks,
      },
   })
}
