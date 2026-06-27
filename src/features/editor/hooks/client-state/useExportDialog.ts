import { useEffect, useRef, useState, useCallback } from 'react'

import { useSelector } from '@xstate/react'
import { createFFmpegRenderer } from '../../renderer/FFmpegRenderer'

import { useProjectStore } from '../../store/project.store'

import type { ActorRef } from 'xstate'

export interface ExportDialogProps {
  actor: ActorRef<any, any>
}

export function useExportDialog({ actor }: ExportDialogProps) {
  const state = useSelector(
    actor,
    (s) =>
      s as {
        value: string
        context: {
          progress: number
          error: string | null
          outputBlob: Blob | null
        }
      },
  )
  const send = actor.send
  const project = useProjectStore((s) => s.project)
  const setExporting = useProjectStore((s) => s.setExporting)
  const rendererRef = useRef<ReturnType<typeof createFFmpegRenderer> | null>(
    null,
  )
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stateValue = typeof state.value === 'string' ? state.value : 'encoding'

  useEffect(() => {
    if (
      stateValue === 'idle' ||
      stateValue === 'completed' ||
      stateValue === 'failed'
    ) {
      setExporting(false)
    }
  }, [stateValue, setExporting])

  useEffect(() => {
    if (stateValue !== 'encoding') return

    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    let cancelled = false
    const renderer = createFFmpegRenderer()
    rendererRef.current = renderer

    renderer.onProgress((progress) => {
      if (!cancelled) send({ type: 'PROGRESS', progress })
    })

    renderer.export(project).then((result) => {
      if (cancelled) return
      if (result.isOk()) {
        send({ type: 'COMPLETE', blob: result.value })
      } else {
        const reason =
          result.error.type === 'FFMPEG.EXPORT_FAILED'
            ? result.error.reason
            : 'Export failed'
        send({ type: 'FAILED', error: reason })
      }
    })

    return () => {
      cancelled = true
      renderer.cancel()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [stateValue, project, send])

  const handleCancel = useCallback(() => {
    rendererRef.current?.cancel()
    rendererRef.current = null
    send({ type: 'CANCEL' })
  }, [send])

  const handleReset = useCallback(() => {
    send({ type: 'RESET' })
  }, [send])

  const handleRetry = useCallback(() => {
    send({ type: 'START_EXPORT' })
  }, [send])

  const handleDownload = useCallback(() => {
    const blob = state.context.outputBlob
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.mp4`
    a.click()
    URL.revokeObjectURL(url)
  }, [state.context.outputBlob, project.name])

  if (stateValue === 'idle') {
    return null
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return {
    state,
    elapsed,
    formatTime,
    handleDownload,
    handleRetry,
    handleReset,
    handleCancel,
    stateValue,
  }
}
