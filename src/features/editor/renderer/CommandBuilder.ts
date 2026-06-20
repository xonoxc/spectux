import type { Command } from '~'
import {
  createSplitClipCommand,
  createMoveClipCommand,
  createDeleteClipCommand,
  createTrimClipCommand,
} from '~'

export function buildSplitClip(clipId: string, splitTime: number): Command {
  return createSplitClipCommand({ clipId, splitTime })
}

export function buildMoveClip(
  clipId: string,
  newTimelineStart: number,
  targetTrackId?: string,
): Command {
  return createMoveClipCommand({
    clipId,
    newTimelineStart,
    targetTrackId,
  })
}

export function buildDeleteClip(clipId: string): Command {
  return createDeleteClipCommand({ clipId })
}

export function buildTrimClip(
  clipId: string,
  newStart: number,
  newEnd: number,
): Command {
  return createTrimClipCommand({ clipId, newStart, newEnd })
}
