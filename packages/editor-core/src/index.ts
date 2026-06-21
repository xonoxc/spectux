export type { Clip, Effect } from './timeline/Clip'
export {
  createClip,
  clipDuration,
  clipEndTime,
  moveClip,
  trimClip,
  splitClipAt,
} from './timeline/Clip'
export type { Track, TrackType } from './timeline/Track'

export {
  createTrack,
  duration,
  addClip,
  removeClip,
  updateClip,
  hasOverlap,
  hasAnyOverlap,
  findClipAtTime,
} from './timeline/Track'
export type { Timeline } from './timeline/Timeline'

export {
  createTimeline,
  addTrack,
  removeTrack,
  getTrack,
  totalDuration,
  findClip,
} from './timeline/Timeline'
export type { Project, Asset } from './project/Project'

export { createProject, getAsset } from './project/Project'
export { serializeProject, deserializeProject } from './project/serializer'
export type { ProjectJSON } from './project/serializer'

export { splitClip, canSplitAt } from './operations/splitClip'
export { moveClipToTime, moveClipToTrack } from './operations/moveClip'
export { trimClipOperation } from './operations/trimClip'
export { createCommandManager } from './commands/CommandManager'
export type { CommandManager, HistoryEntry, Command } from './commands'

export {
  createSplitClipCommand,
  createMoveClipCommand,
  createDeleteClipCommand,
  createTrimClipCommand,
} from './commands'
export { createMuteClipCommand, createChangeVolumeCommand } from './commands'
export type { EditorError } from './errors/errors'
export type { EditorEvent } from './events/EditorEvent'
