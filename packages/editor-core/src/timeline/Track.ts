import { err, ok } from "neverthrow"
import type { Result } from "neverthrow"
import { clipEndTime } from "./Clip"
import type { Clip } from "./Clip"
import type { EditorError } from "../errors/errors"

export type TrackType = "video" | "audio"

export interface Track {
   id: string
   type: TrackType
   clips: Clip[]
   muted: boolean
   volume: number
}

export function createTrack(params: { id: string; type: TrackType }): Track {
   return {
      id: params.id,
      type: params.type,
      clips: [],
      muted: false,
      volume: 1,
   }
}

export function duration(track: Track): number {
   if (track.clips.length === 0) return 0
   return Math.max(...track.clips.map(clipEndTime))
}

export function addClip(track: Track, clip: Clip): Result<Track, EditorError> {
   if (hasOverlap(track, clip)) {
      return err({
         type: "TIMELINE.OVERLAP_DETECTED",
         clipId: clip.id,
         trackId: track.id,
      })
   }
   return ok({
      ...track,
      clips: [...track.clips, clip].sort((a, b) => a.timelineStart - b.timelineStart),
   })
}

export function removeClip(track: Track, clipId: string): Result<Track, EditorError> {
   const idx = track.clips.findIndex(c => c.id === clipId)
   if (idx === -1) {
      return err({ type: "TIMELINE.CLIP_NOT_FOUND", clipId })
   }
   return ok({
      ...track,
      clips: track.clips.filter(c => c.id !== clipId),
   })
}

export function updateClip(track: Track, updatedClip: Clip): Result<Track, EditorError> {
   const idx = track.clips.findIndex(c => c.id === updatedClip.id)
   if (idx === -1) {
      return err({ type: "TIMELINE.CLIP_NOT_FOUND", clipId: updatedClip.id })
   }
   const newClips = [...track.clips]
   newClips[idx] = updatedClip

   const tempTrack: Track = { ...track, clips: newClips }
   if (hasAnyOverlap(tempTrack)) {
      return err({
         type: "TIMELINE.OVERLAP_DETECTED",
         clipId: updatedClip.id,
         trackId: track.id,
      })
   }

   return ok({ ...tempTrack })
}

export function hasOverlap(track: Track, clip: Clip): boolean {
   const newEnd = clipEndTime(clip)
   return track.clips.some(existing => {
      if (existing.id === clip.id) return false
      const existingEnd = clipEndTime(existing)
      return clip.timelineStart < existingEnd && newEnd > existing.timelineStart
   })
}

export function hasAnyOverlap(track: Track): boolean {
   const sorted = [...track.clips].sort((a, b) => a.timelineStart - b.timelineStart)
   for (let i = 1; i < sorted.length; i++) {
      if (clipEndTime(sorted[i - 1]) > sorted[i].timelineStart) {
         return true
      }
   }
   return false
}

export function findClipAtTime(track: Track, time: number): Clip | undefined {
   return track.clips.find(clip => time >= clip.timelineStart && time < clipEndTime(clip))
}
