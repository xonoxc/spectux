import type { Result } from 'neverthrow'
import type { Project } from '../project/Project'
import type { EditorError } from '../errors/errors'
import type { EditorEvent } from '../events/EditorEvent'

export interface Command {
  readonly type: string
  execute: (project: Project) => Result<Project, EditorError>
  undo: (project: Project) => Result<Project, EditorError>
  emitEvent: (
    previousProject: Project,
    newProject: Project,
  ) => EditorEvent | null
}
