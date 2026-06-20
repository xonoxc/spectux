import { ok } from 'neverthrow'
import type { Result } from 'neverthrow'
import type { Project } from '../project/Project'
import type { EditorError } from '../errors/errors'
import type { Command } from './Command'

const MAX_HISTORY = 100

export interface HistoryEntry {
  command: Command
  projectSnapshot: Project
}

export interface CommandManager {
  execute: (
    command: Command,
    project: Project,
  ) => Result<
    { project: Project; event: ReturnType<Command['emitEvent']> },
    EditorError
  >
  undo: (
    project: Project,
  ) => Result<{ project: Project; command: Command } | null, EditorError>
  redo: (
    project: Project,
  ) => Result<{ project: Project; command: Command } | null, EditorError>
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
  getUndoStack: () => HistoryEntry[]
  getRedoStack: () => HistoryEntry[]
}

export function createCommandManager(): CommandManager {
  const undoStack: HistoryEntry[] = []
  const redoStack: HistoryEntry[] = []

  return {
    execute(command, project) {
      const snapshot: Project = structuredClone(project)
      const result = command.execute(project)

      if (result.isErr()) {
        return result as unknown as Result<
          { project: Project; event: ReturnType<Command['emitEvent']> },
          EditorError
        >
      }

      const newProject = result.value
      const event = command.emitEvent(snapshot, newProject)

      undoStack.push({ command, projectSnapshot: snapshot })
      if (undoStack.length > MAX_HISTORY) {
        undoStack.shift()
      }
      redoStack.length = 0

      return ok({ project: newProject, event })
    },

    undo(project) {
      const entry = undoStack.pop()
      if (!entry) {
        return ok(null)
      }

      const result = entry.command.undo(project)
      if (result.isErr()) {
        undoStack.push(entry)
        return result as unknown as Result<
          { project: Project; command: Command } | null,
          EditorError
        >
      }

      redoStack.push(entry)
      return ok({ project: result.value, command: entry.command })
    },

    redo(project) {
      const entry = redoStack.pop()
      if (!entry) {
        return ok(null)
      }

      const result = entry.command.execute(project)
      if (result.isErr()) {
        redoStack.push(entry)
        return result as unknown as Result<
          { project: Project; command: Command } | null,
          EditorError
        >
      }

      undoStack.push(entry)
      return ok({ project: result.value, command: entry.command })
    },

    canUndo() {
      return undoStack.length > 0
    },

    canRedo() {
      return redoStack.length > 0
    },

    clear() {
      undoStack.length = 0
      redoStack.length = 0
    },

    getUndoStack() {
      return [...undoStack]
    },

    getRedoStack() {
      return [...redoStack]
    },
  }
}
