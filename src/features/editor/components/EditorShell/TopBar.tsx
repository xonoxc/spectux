import { useState, useCallback, useRef } from 'react'
import { useProjectStore } from '../../store/project.store'
import { useSaveProject } from '../../hooks/useProjects'
import { createFFmpegRenderer } from '../../renderer/FFmpegRenderer'
import { Save, Video, Undo2, Redo2, Loader2, Download } from 'lucide-react'

type ExportState = 'idle' | 'exporting' | 'done' | 'error'

export function TopBar() {
  const project = useProjectStore((s) => s.project)
  const isDirty = useProjectStore((s) => s.isDirty)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const saveMutation = useSaveProject()

  const [exportState, setExportState] = useState<ExportState>('idle')
  const [exportProgress, setExportProgress] = useState(0)
  const [exportError, setExportError] = useState<string | null>(null)
  const rendererRef = useRef<ReturnType<typeof createFFmpegRenderer> | null>(
    null,
  )

  function handleSave() {
    saveMutation.mutate(project, {
      onSuccess: () => {
        useProjectStore.getState().markClean()
      },
    })
  }

  const handleExport = useCallback(async () => {
    const hasClips = project.timeline.tracks.some((t) => t.clips.length > 0)
    if (!hasClips) return

    setExportState('exporting')
    setExportProgress(0)
    setExportError(null)

    const renderer = createFFmpegRenderer()
    renderer.onProgress(setExportProgress)
    rendererRef.current = renderer

    try {
      const result = await renderer.export(project)

      if (result.isErr()) {
        setExportError(
          result.error.type === 'FFMPEG.EXPORT_FAILED'
            ? result.error.reason
            : 'Export failed',
        )
        setExportState('error')
        return
      }

      const blob = result.value
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.mp4`
      a.click()
      URL.revokeObjectURL(url)

      setExportProgress(1)
      setExportState('done')
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed')
      setExportState('error')
    } finally {
      rendererRef.current = null
    }
  }, [project])

  let buttonContent: React.ReactNode
  if (exportState === 'exporting') {
    buttonContent = (
      <>
        <Loader2 size={12} className="animate-spin" />
        {Math.round(exportProgress * 100)}%
      </>
    )
  } else if (exportState === 'done') {
    buttonContent = (
      <>
        <Download size={12} />
        Exported
      </>
    )
  } else if (exportState === 'error') {
    buttonContent = (
      <>
        <Video size={12} />
        Retry
      </>
    )
  } else {
    buttonContent = (
      <>
        <Video size={12} />
        Export
      </>
    )
  }

  let btnClass = 'flex items-center gap-1.5 rounded px-3 py-1 text-xs '
  if (exportState === 'exporting') {
    btnClass += 'bg-blue-800 text-blue-200 cursor-wait'
  } else if (exportState === 'done') {
    btnClass += 'bg-green-700 text-green-100'
  } else if (exportState === 'error') {
    btnClass += 'bg-red-800 text-red-200 hover:bg-red-700'
  } else {
    btnClass += 'bg-blue-600 text-white hover:bg-blue-500'
  }

  return (
    <div className="flex h-10 items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-3">
      <div className="flex items-center gap-1.5">
        <Video size={16} className="text-neutral-400" />
        <span className="text-sm font-medium text-neutral-200">Spectux</span>
      </div>
      <div className="mx-2 h-5 w-px bg-neutral-700" />
      <span className="text-sm text-neutral-400">
        {project.name}
        {isDirty && <span className="ml-1 text-neutral-500">•</span>}
      </span>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redo}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          title="Redo"
        >
          <Redo2 size={14} />
        </button>
      </div>
      <button
        onClick={handleSave}
        disabled={!isDirty || saveMutation.isPending}
        className="flex items-center gap-1.5 rounded bg-neutral-800 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
      >
        <Save size={12} />
        {saveMutation.isPending ? 'Saving...' : 'Save'}
      </button>
      {exportState === 'error' && exportError && (
        <span
          className="max-w-64 truncate text-xs text-red-300"
          title={exportError}
        >
          {exportError}
        </span>
      )}
      <button
        onClick={handleExport}
        disabled={exportState === 'exporting'}
        className={btnClass}
      >
        {buttonContent}
      </button>
    </div>
  )
}
