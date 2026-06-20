import { useCallback, useRef, useState } from 'react'
import type { Clip } from '#/../packages/editor-core/src'
import { useProjectStore } from '../../store/project.store'
import { buildMoveClip, buildTrimClip } from '../../renderer/CommandBuilder'

function clipEnd(c: Clip) {
  return c.timelineStart + (c.end - c.start)
}

function findSnapPosition(clipId: string, desiredStart: number, duration: number): number {
  const { project } = useProjectStore.getState()
  const track = project.timeline.tracks.find((t) => t.clips.some((c) => c.id === clipId))
  if (!track) return Math.max(0, desiredStart)

  const others = track.clips
    .filter((c) => c.id !== clipId)
    .sort((a, b) => a.timelineStart - b.timelineStart)

  if (others.length === 0) return Math.max(0, desiredStart)

  let prevEnd = 0
  for (const other of others) {
    if (prevEnd + duration <= other.timelineStart) {
      const gapStart = prevEnd
      const gapEnd = other.timelineStart
      if (desiredStart >= gapStart && desiredStart + duration <= gapEnd) {
        return desiredStart
      }
      if (desiredStart < gapStart) return gapStart
      return gapEnd - duration
    }
    prevEnd = clipEnd(other)
  }

  return Math.max(prevEnd, desiredStart)
}

interface ClipItemProps {
  clip: Clip
  assetName: string
  pixelsPerSecond: number
  trackHeight: number
  isSelected: boolean
  zoom: number
  trackId: string
}

const HANDLE_WIDTH = 6

export function ClipItem({
  clip,
  assetName,
  pixelsPerSecond,
  trackHeight,
  isSelected,
  trackId,
}: ClipItemProps) {
  void trackId
  const dragStartX = useRef(0)
  const dragStartTimelineStart = useRef(0)
  const [visualOffset, setVisualOffset] = useState(0)

  const baseX = clip.timelineStart * pixelsPerSecond
  const width = (clip.end - clip.start) * pixelsPerSecond

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

        if (newStart < originalEnd - 0.1) {
          useProjectStore.getState().setCurrentTime(newStart)
        }
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [clip.id, clip.start, clip.end, pixelsPerSecond],
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

  return (
    <div
      data-clip-id={clip.id}
      className={`absolute top-1 rounded border text-xs transition-shadow ${
        isSelected
          ? 'z-10 border-blue-500 bg-blue-900/40 shadow-lg shadow-blue-500/10'
          : 'z-0 border-neutral-700 bg-neutral-800 hover:border-neutral-600'
      }`}
      style={{
        left: baseX,
        width: Math.max(width, 10),
        height: trackHeight - 8,
        cursor: 'grab',
        transform: `translateX(${visualOffset}px)`,
        willChange: visualOffset !== 0 ? 'transform' : undefined,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="absolute left-0 top-0 h-full cursor-col-resize hover:bg-blue-500/30"
        style={{ width: HANDLE_WIDTH }}
        onMouseDown={handleTrimStart}
      />
      <div className="flex h-full items-center px-2">
        <span className="truncate text-[10px] text-neutral-300">
          {assetName}
        </span>
      </div>
      <div
        className="absolute right-0 top-0 h-full cursor-col-resize hover:bg-blue-500/30"
        style={{ width: HANDLE_WIDTH }}
        onMouseDown={handleTrimEnd}
      />
    </div>
  )
}
