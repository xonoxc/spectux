import { useEffect, useRef } from 'react'
import { useProjectStore } from '../store/project.store'
import { buildDeleteClip } from '../renderer/CommandBuilder'

interface ShortcutActions {
  onSave?: () => void
  onExport?: () => void
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        useProjectStore.getState().redo()
        return
      }

      if (mod && e.key === 'z') {
        e.preventDefault()
        useProjectStore.getState().undo()
        return
      }

      if (mod && e.key === 's') {
        e.preventDefault()
        actionsRef.current.onSave?.()
        return
      }

      if (mod && e.key === 'e') {
        e.preventDefault()
        actionsRef.current.onExport?.()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const store = useProjectStore.getState()
        const clipIds = store.selectedClipIds
        if (clipIds.length > 0) {
          e.preventDefault()
          for (const id of clipIds) {
            store.executeCommand(buildDeleteClip(id))
          }
        }
        return
      }

      if (!mod && (e.key === 'v' || e.key === 'V')) {
        useProjectStore.getState().setSelectedTool('select')
        return
      }

      if (!mod && (e.key === 'c' || e.key === 'C')) {
        useProjectStore.getState().setSelectedTool('cut')
        return
      }

      if (!mod && (e.key === 't' || e.key === 'T')) {
        useProjectStore.getState().setSelectedTool('trim')
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
}
