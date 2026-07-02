import { useState } from "react"
import { useSelector } from "@xstate/react"
import { useProjectStore } from "../../store/project.store"
import { useSaveProject } from "../../hooks/useProjects"
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts"
import { Save, Video, Undo2, Redo2, Pencil, Image, PanelRightClose } from "lucide-react"
import type { ActorRef } from "xstate"

const MOD_KEY = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'

interface TopBarProps {
  actor: ActorRef<any, any>
  onToggleMedia: () => void
  onToggleInspector: () => void
  showMobileMediaPanel: boolean
  showMobileInspectorPanel: boolean
  hasSelection: boolean
}

export function TopBar({ actor, onToggleMedia, onToggleInspector, showMobileMediaPanel, showMobileInspectorPanel, hasSelection }: TopBarProps) {
  const project = useProjectStore(s => s.project)
  const isDirty = useProjectStore(s => s.isDirty)
  const undo = useProjectStore(s => s.undo)
  const redo = useProjectStore(s => s.redo)
  const setProjectName = useProjectStore(s => s.setProjectName)
  const setExporting = useProjectStore(s => s.setExporting)
  const saveMutation = useSaveProject()

  const exportState = useSelector(actor, s => (s as { value: string }).value)
  const isExporting = exportState === "preparing" || exportState === "encoding"

  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameDraft, setRenameDraft] = useState(project.name)

  const [showExportNamePrompt, setShowExportNamePrompt] = useState(false)
  const [exportNameDraft, setExportNameDraft] = useState(project.name)

  useKeyboardShortcuts({ onSave: handleSave, onExport: handleExport })

  function openRename() {
    setRenameDraft(project.name)
    setShowRenameDialog(true)
  }

  function commitRename() {
    const trimmed = renameDraft.trim()
    if (trimmed && trimmed !== project.name) {
      setProjectName(trimmed)
    }
    setShowRenameDialog(false)
  }

  function handleExport() {
    if (project.name === "Untitled Project") {
      setExportNameDraft(project.name)
      setShowExportNamePrompt(true)
    } else {
      setExporting(true)
      actor.send({ type: "START_EXPORT" })
    }
  }

  function commitExportName() {
    const trimmed = exportNameDraft.trim()
    if (trimmed) {
      setProjectName(trimmed)
    }
    setShowExportNamePrompt(false)
    setExporting(true)
    actor.send({ type: "START_EXPORT" })
  }

  function handleSave() {
    const p = useProjectStore.getState().project
    saveMutation.mutate(p, {
      onSuccess: () => {
        useProjectStore.getState().markClean()
      },
    })
  }

  return (
    <div className="flex h-10 items-center gap-1 border-b border-neutral-800 bg-neutral-900 px-2 md:gap-2 md:px-3">
      <div className="flex items-center gap-1 md:gap-1.5">
        <Video size={16} className="text-neutral-400" />
        <span className="text-sm font-medium text-neutral-200">Spectux</span>
      </div>
      <div className="mx-1 h-5 w-px bg-neutral-700 md:mx-2" />
      <div className="hidden items-center gap-1 sm:flex">
        <span className="max-w-28 truncate rounded px-1 text-sm text-neutral-400 md:max-w-48">
          {project.name}
        </span>
        <button
          onClick={openRename}
          className="rounded p-0.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
          title="Rename project"
        >
          <Pencil size={12} />
        </button>
        {isDirty && <span className="text-neutral-500">•</span>}
      </div>
      <div className="flex-1" />

      {/* Mobile side-panel toggles */}
      <button
        onClick={onToggleMedia}
        className={`rounded p-1 md:hidden ${showMobileMediaPanel ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'}`}
        title="Media"
      >
        <Image size={14} />
      </button>
      {hasSelection && (
        <button
          onClick={onToggleInspector}
          className={`rounded p-1 md:hidden ${showMobileInspectorPanel ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'}`}
          title="Inspector"
        >
          <PanelRightClose size={14} />
        </button>
      )}

      {/* Desktop undo/redo */}
      <div className="hidden items-center gap-1 md:flex">
        <button
          onClick={undo}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          title={`Undo (${MOD_KEY}+Z)`}
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redo}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          title={`Redo (${MOD_KEY}+Shift+Z)`}
        >
          <Redo2 size={14} />
        </button>
      </div>

      {/* Save — hidden on mobile */}
      <button
        onClick={handleSave}
        disabled={!isDirty || saveMutation.isPending}
        className="hidden items-center gap-1.5 rounded bg-neutral-800 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 md:flex"
      >
        <Save size={12} />
        {saveMutation.isPending ? "Saving..." : "Save"}
        <kbd className="ml-0.5 rounded bg-neutral-700 px-1 text-[10px] text-neutral-500">{MOD_KEY}+S</kbd>
      </button>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 md:gap-1.5 md:px-3"
      >
        <Video size={12} />
        <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export"}</span>
        <kbd className="ml-0.5 rounded bg-blue-700 px-1 text-[10px] text-blue-300">{MOD_KEY}+E</kbd>
      </button>

      {showRenameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-80 rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-xl">
            <h2 className="mb-3 text-sm font-medium text-neutral-200">Rename project</h2>
            <input
              value={renameDraft}
              onChange={e => setRenameDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") commitRename()
                if (e.key === "Escape") setShowRenameDialog(false)
              }}
              className="mb-4 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 outline-none ring-1 ring-transparent focus:ring-blue-500"
              placeholder="Project name"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRenameDialog(false)}
                className="rounded bg-neutral-800 px-4 py-1.5 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={commitRename}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-80 rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-xl">
            <h2 className="mb-3 text-sm font-medium text-neutral-200">Name your project</h2>
            <p className="mb-3 text-xs text-neutral-500">
              Give your project a name before exporting.
            </p>
            <input
              value={exportNameDraft}
              onChange={e => setExportNameDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") commitExportName()
                if (e.key === "Escape") setShowExportNamePrompt(false)
              }}
              className="mb-4 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 outline-none ring-1 ring-transparent focus:ring-blue-500"
              placeholder="Project name"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowExportNamePrompt(false)}
                className="rounded bg-neutral-800 px-4 py-1.5 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={commitExportName}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-500"
              >
                Start Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
