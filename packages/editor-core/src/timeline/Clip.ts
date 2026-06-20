import type { EditorError } from '../errors/errors'
import { err, ok } from 'neverthrow'
import type { Result } from 'neverthrow'

export interface Clip {
  id: string
  assetId: string
  type: 'video' | 'audio'
  timelineStart: number
  start: number
  end: number
  muted: boolean
  volume: number
  effects: Effect[]
}

export interface Effect {
  id: string
  type: string
  params: Record<string, unknown>
}

export function createClip(params: {
  id: string
  assetId: string
  type?: 'video' | 'audio'
  start: number
  end: number
  timelineStart: number
}): Clip {
  return {
    id: params.id,
    assetId: params.assetId,
    type: params.type ?? 'video',
    start: params.start,
    end: params.end,
    timelineStart: params.timelineStart,
    muted: false,
    volume: 1,
    effects: [],
  }
}

export function clipDuration(clip: Clip): number {
  return clip.end - clip.start
}

export function clipEndTime(clip: Clip): number {
  return clip.timelineStart + clipDuration(clip)
}

export function moveClip(
  clip: Clip,
  newTimelineStart: number,
): Result<Clip, EditorError> {
  if (newTimelineStart < 0) {
    return err({
      type: 'TIMELINE.CLIP_OUT_OF_BOUNDS',
      clipId: clip.id,
    })
  }

  return ok({
    ...clip,
    timelineStart: newTimelineStart,
  })
}

export function trimClip(
  clip: Clip,
  newStart: number,
  newEnd: number,
): Result<Clip, EditorError> {
  if (newStart < 0 || newEnd <= newStart) {
    return err({
      type: 'TIMELINE.INVALID_TRIM',
      clipId: clip.id,
      start: newStart,
      end: newEnd,
    })
  }

  return ok({
    ...clip,
    start: newStart,
    end: newEnd,
  })
}

export function splitClipAt(
  clip: Clip,
  splitTime: number,
): Result<[Clip, Clip], EditorError> {
  const localSplit = splitTime - clip.timelineStart

  if (localSplit <= 0 || localSplit >= clipDuration(clip)) {
    return err({
      type: 'TIMELINE.INVALID_SPLIT',
      clipId: clip.id,
      position: splitTime,
    })
  }

  if (localSplit < 0.1 || clipDuration(clip) - localSplit < 0.1) {
    return err({
      type: 'TIMELINE.SPLIT_TOO_SMALL',
      clipId: clip.id,
    })
  }

  const left: Clip = {
    ...clip,
    end: clip.start + localSplit,
  }

  const right: Clip = {
    ...clip,
    id: `${clip.id}-split`,
    start: clip.start + localSplit,
    end: clip.end,
    timelineStart: clip.timelineStart + localSplit,
  }

  return ok([left, right])
}
