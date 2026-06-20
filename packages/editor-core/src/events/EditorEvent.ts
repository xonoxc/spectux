import type { Clip } from '../timeline/Clip'
import type { Track } from '../timeline/Track'
import type { Asset } from '../project/Project'

export type EditorEvent =
  | { type: 'CLIP_ADDED'; clip: Clip; trackId: string }
  | { type: 'CLIP_REMOVED'; clipId: string; trackId: string }
  | {
      type: 'CLIP_MOVED'
      clipId: string
      oldTimelineStart: number
      newTimelineStart: number
    }
  | {
      type: 'CLIP_TRIMMED'
      clipId: string
      oldStart: number
      oldEnd: number
      newStart: number
      newEnd: number
    }
  | { type: 'CLIP_SPLIT'; clipId: string; leftClip: Clip; rightClip: Clip }
  | { type: 'TRACK_ADDED'; track: Track }
  | { type: 'TRACK_REMOVED'; trackId: string }
  | { type: 'ASSET_IMPORTED'; asset: Asset }
  | { type: 'ASSET_REMOVED'; assetId: string }
  | { type: 'CLIP_MUTED'; clipId: string; muted: boolean }
  | { type: 'CLIP_VOLUME_CHANGED'; clipId: string; volume: number }
  | { type: 'PROJECT_SAVED'; projectId: string }
  | { type: 'PROJECT_LOADED'; projectId: string }
  | { type: 'UNDO'; commandId: string }
  | { type: 'REDO'; commandId: string }
