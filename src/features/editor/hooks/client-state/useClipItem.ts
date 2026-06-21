import { useCallback, useRef, useState } from 'react'
import { useProjectStore } from '../../store/project.store'
import {
  buildDeleteClip,
  buildMoveClip,
  buildTrimClip,
} from '../../renderer/CommandBuilder'

import { createMuteClipCommand } from '~'

import type { Clip } from '~'

export interface ClipItemProps {
  clip: Clip
  assetName: string
  pixelsPerSecond: number
  trackHeight: number
  isSelected: boolean
  zoom: number
  trackId: string
}

export function useClipItem({
  clip,
  assetName,
  pixelsPerSecond,
  trackHeight,
  isSelected,
  trackId,
}: ClipItemProps) {
  void trackId
  const baseX = clip.timelineStart * pixelsPerSecond
  const width = (clip.end - clip.start) * pixelsPerSecond

  const dragStartX = useRef(0)
  const dragStartTimelineStart = useRef(0)
  const [visualOffset, setVisualOffset] = useState(0)

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const command = buildDeleteClip(clip.id)
      useProjectStore.getState().executeCommand(command)
    },
    [clip.id],
  )

  const handleTrimEnd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const dragStart = e.clientX
      const originalEnd = clip.end

      function onMouseUp(ev: MouseEvent) {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)

        const deltaX = ev.clientX - dragStart
        const deltaTime = deltaX / pixelsPerSecond
        const newEnd = Math.max(clip.start + 0.1, originalEnd + deltaTime)

        if (Math.abs(deltaTime) > 0.05) {
          const command = buildTrimClip(clip.id, clip.start, newEnd)
          useProjectStore.getState().executeCommand(command)
        }
      }

      function onMouseMove(ev: MouseEvent) {
        const deltaX = ev.clientX - dragStart
        const deltaTime = deltaX / pixelsPerSecond
        const newEnd = Math.max(clip.start + 0.1, originalEnd + deltaTime)

        useProjectStore.getState().setCurrentTime(newEnd)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [clip.id, clip.start, clip.end, pixelsPerSecond],
  )

  const handleTrimStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const dragStart = e.clientX
      const originalStart = clip.start
      const originalEnd = clip.end

      function onMouseUp(ev: MouseEvent) {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)

        const deltaX = ev.clientX - dragStart
        const deltaTime = deltaX / pixelsPerSecond
        const newStart = Math.max(0, originalStart + deltaTime)

        if (Math.abs(deltaTime) > 0.05 && newStart < originalEnd - 0.1) {
          const command = buildTrimClip(clip.id, newStart, originalEnd)
          useProjectStore.getState().executeCommand(command)
        }
      }

      function onMouseMove(ev: MouseEvent) {
        const deltaX = ev.clientX - dragStart
        const deltaTime = deltaX / pixelsPerSecond
        const newStart = Math.max(0, originalStart + deltaTime)

        if (newStart < originalEnd - 0.1)
          useProjectStore.getState().setCurrentTime(newStart)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [clip.id, clip.start, clip.end, pixelsPerSecond],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      dragStartX.current = e.clientX
      dragStartTimelineStart.current = clip.timelineStart
      setVisualOffset(0)

      useProjectStore.getState().selectClip(clip.id)

      function onMouseMove(ev: MouseEvent) {
        const deltaX = ev.clientX - dragStartX.current
        setVisualOffset(deltaX)
      }

      function onMouseUp(ev: MouseEvent) {
        setVisualOffset(0)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)

        const deltaX = ev.clientX - dragStartX.current
        const deltaTime = deltaX / pixelsPerSecond
        const desiredStart = Math.max(
          0,
          dragStartTimelineStart.current + deltaTime,
        )

        if (Math.abs(deltaTime) > 0.05) {
          const snapTarget = findSnapPosition(
            clip.id,
            desiredStart,
            clip.end - clip.start,
          )
          const command = buildMoveClip(clip.id, snapTarget)
          useProjectStore.getState().executeCommand(command)
        }
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [clip.id, clip.timelineStart, pixelsPerSecond],
  )

  const handleMute = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const command = createMuteClipCommand({
        clipId: clip.id,
        muted: !clip.muted,
      })
      useProjectStore.getState().executeCommand(command)
    },
    [clip.id, clip.muted],
  )

  return {
    clip,
    isSelected,
    trackHeight,
    width,
    baseX,
    visualOffset,
    handleMouseDown,
    assetName,

    handleMute,
    handleTrimStart,
    handleTrimEnd,
    handleDelete,
  }
}

export function clipEnd(c: Clip) {
  return c.timelineStart + (c.end - c.start)
}

export function findSnapPosition(
  clipId: string,
  desiredStart: number,
  duration: number,
): number {
  const { project } = useProjectStore.getState()

  const track = project.timeline.tracks.find((t) =>
    t.clips.some((c) => c.id === clipId),
  )
  if (!track) {
    return Math.max(0, desiredStart)
  }

  const others = track.clips
    .filter((c) => c.id !== clipId)
    .sort((a, b) => a.timelineStart - b.timelineStart)

  if (!others.length) {
    return Math.max(0, desiredStart)
  }

  let prevEnd = 0
  for (const other of others) {
    if (prevEnd + duration <= other.timelineStart) {
      const gapStart = prevEnd
      const gapEnd = other.timelineStart
      if (desiredStart >= gapStart && desiredStart + duration <= gapEnd) {
        return desiredStart
      }
      if (desiredStart < gapStart) {
        return gapStart
      }
      return gapEnd - duration
    }
    prevEnd = clipEnd(other)
  }

  return Math.max(prevEnd, desiredStart)
}
