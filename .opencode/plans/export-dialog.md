# Export Dialog Implementation

## Step 1: Update `export.machine.ts`

Add `CANCEL` event type and handle it in `preparing` and `encoding` states.

```diff
 events: {} as
   | { type: 'START_EXPORT' }
   | { type: 'PROGRESS'; progress: number }
   | { type: 'COMPLETE'; blob: Blob }
   | { type: 'FAILED'; error: string }
+  | { type: 'CANCEL' }
   | { type: 'RESET' },
```

```diff
 preparing: {
   entry: ({ context }) => {
     context.progress = 0
     context.error = null
     context.outputBlob = null
   },
   after: {
     100: 'encoding',
   },
+  on: {
+    CANCEL: 'idle',
+  },
 },
 encoding: {
   on: {
     PROGRESS: {
       actions: ({ context, event }) => {
         context.progress = event.progress
       },
     },
     COMPLETE: {
       target: 'completed',
       actions: ({ context, event }) => {
         context.outputBlob = event.blob
         context.progress = 1
       },
     },
     FAILED: {
       target: 'failed',
       actions: ({ context, event }) => {
         context.error = event.error
       },
     },
+    CANCEL: 'idle',
   },
 },
```

---

## Step 2: Create `ExportDialog.tsx`

New file at `src/features/editor/components/Export/ExportDialog.tsx`

```tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import type { ActorRefFrom } from 'xstate'
import { useSelector } from '@xstate/react'
import { Loader2, X, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createFFmpegRenderer } from '../../renderer/FFmpegRenderer'
import { useProjectStore } from '../../store/project.store'
import type { exportMachine } from '../../machines/export.machine'

interface ExportDialogProps {
  actor: ActorRefFrom<typeof exportMachine>
}

export function ExportDialog({ actor }: ExportDialogProps) {
  const state = useSelector(actor, (s) => s)
  const send = actor.send
  const project = useProjectStore((s) => s.project)
  const rendererRef = useRef<ReturnType<typeof createFFmpegRenderer> | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stateValue = typeof state.value === 'string' ? state.value : 'encoding'

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
  }, [stateValue])

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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  if (stateValue === 'idle') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-200">
            {stateValue === 'preparing' && 'Preparing Export'}
            {stateValue === 'encoding' && 'Exporting Video'}
            {stateValue === 'completed' && 'Export Complete'}
            {stateValue === 'failed' && 'Export Failed'}
          </h2>
          {(stateValue === 'completed' || stateValue === 'failed') && (
            <button
              onClick={handleReset}
              className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Preparing */}
        {stateValue === 'preparing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={24} className="animate-spin text-blue-400" />
            <p className="text-sm text-neutral-400">Preparing timeline...</p>
          </div>
        )}

        {/* Encoding */}
        {stateValue === 'encoding' && (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-400" />
              <span className="text-sm text-neutral-300">Rendering video...</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.round(state.context.progress * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>{Math.round(state.context.progress * 100)}%</span>
              <span>Elapsed: {formatTime(elapsed)}</span>
            </div>
            <button
              onClick={handleCancel}
              className="mt-2 self-center rounded bg-neutral-800 px-4 py-1.5 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Completed */}
        {stateValue === 'completed' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 size={32} className="text-green-400" />
            <p className="text-sm text-neutral-300">Export complete</p>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-500"
              >
                <Download size={12} />
                Download
              </button>
              <button
                onClick={handleReset}
                className="rounded bg-neutral-800 px-4 py-1.5 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Failed */}
        {stateValue === 'failed' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-xs text-red-300">
              {state.context.error || 'Export failed'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-500"
              >
                Retry
              </button>
              <button
                onClick={handleReset}
                className="rounded bg-neutral-800 px-4 py-1.5 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Step 3: Simplify `TopBar.tsx`

Replace the entire file with a simplified version that just has [Save] and [Export] buttons. The Export button sends `START_EXPORT` to the machine.

```tsx
import { useProjectStore } from '../../store/project.store'
import { useSaveProject } from '../../hooks/useProjects'
import { Save, Video, Undo2, Redo2 } from 'lucide-react'
import type { ActorRefFrom } from 'xstate'
import { useSelector } from '@xstate/react'
import type { exportMachine } from '../../machines/export.machine'

interface TopBarProps {
  exportActor: ActorRefFrom<typeof exportMachine>
}

export function TopBar({ exportActor }: TopBarProps) {
  const project = useProjectStore((s) => s.project)
  const isDirty = useProjectStore((s) => s.isDirty)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const saveMutation = useSaveProject()
  const exportState = useSelector(exportActor, (s) => s.value)
  const isExporting =
    exportState === 'preparing' || exportState === 'encoding'

  function handleSave() {
    saveMutation.mutate(project, {
      onSuccess: () => {
        useProjectStore.getState().markClean()
      },
    })
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
      <button
        onClick={() => exportActor.send({ type: 'START_EXPORT' })}
        disabled={isExporting}
        className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Video size={12} />
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
    </div>
  )
}
```

---

## Step 4: Update `EditorShell.tsx`

Mount the machine and wire it to both `TopBar` and `ExportDialog`.

```tsx
import { useMachine } from '@xstate/react'
import { TopBar } from './TopBar'
import { ExportDialog } from '../Export/ExportDialog'
import { TimelinePanel } from '../Timeline/TimelinePanel'
import { ViewerPanel } from '../Preview/ViewerPanel'
import { MediaPanel } from '../MediaBin/MediaPanel'
import { InspectorPanel } from '../Inspector/InspectorPanel'
import { useProjectStore } from '../../store/project.store'
import { exportMachine } from '../../machines/export.machine'

export function EditorShell() {
  const [state, send, actor] = useMachine(exportMachine)
  const hasSelection = useProjectStore(
    (s) => s.selectedClipIds.length > 0 || s.inspectedAssetId !== null,
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <TopBar exportActor={actor} />

      <div className="flex shrink-0 overflow-hidden" style={{ height: '55%' }}>
        <div className="flex flex-1 flex-col overflow-hidden border-r border-neutral-800">
          <ViewerPanel />
        </div>
        <div className="flex border-l border-neutral-800">
          <div className="flex w-72 flex-col overflow-hidden">
            <MediaPanel />
          </div>
          {hasSelection && (
            <div className="w-64 shrink-0 overflow-y-auto border-l border-neutral-800">
              <InspectorPanel />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden border-t border-neutral-800">
        <TimelinePanel />
      </div>

      <ExportDialog actor={actor} />
    </div>
  )
}
```

**Note**: `useMachine` in XState v5 with `@xstate/react` v6 returns `[state, send, actor]`. The third element is the actor ref which can be passed to child components. If it returns `[state, send]`, use `actor` from `useInterpret` instead:
```tsx
const actor = useInterpret(exportMachine)
```

Check the actual return type of `useMachine` with your version.

---

## File Operation Summary

| File | Operation |
|------|-----------|
| `src/features/editor/machines/export.machine.ts` | Edit — add CANCEL event |
| `src/features/editor/components/Export/ExportDialog.tsx` | **Create** |
| `src/features/editor/components/EditorShell/TopBar.tsx` | Rewrite — remove export logic |
| `src/features/editor/components/EditorShell/EditorShell.tsx` | Edit — mount machine + wire |

## Verification

1. `pnpm run test` — 19 tests should pass
2. `pnpm run build` — build should succeed
3. `pnpm run lint` — no new errors (pre-existing FFmpegRenderer method-signature errors expected)
