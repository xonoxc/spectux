export type EditorError =
   | { type: "TIMELINE.CLIP_NOT_FOUND"; clipId: string }
   | { type: "TIMELINE.TRACK_NOT_FOUND"; trackId: string }
   | { type: "TIMELINE.INVALID_SPLIT"; clipId: string; position: number }
   | { type: "TIMELINE.OVERLAP_DETECTED"; clipId: string; trackId: string }
   | {
        type: "TIMELINE.INVALID_TRIM"
        clipId: string
        start: number
        end: number
     }
   | { type: "TIMELINE.CLIP_OUT_OF_BOUNDS"; clipId: string }
   | { type: "TIMELINE.SPLIT_TOO_SMALL"; clipId: string }
   | { type: "PROJECT.NOT_FOUND"; projectId: string }
   | { type: "PROJECT.INVALID_DATA"; path: string; reason: string }
   | { type: "ASSET.NOT_FOUND"; assetId: string }
   | { type: "ASSET.IMPORT_FAILED"; reason: string }
   | { type: "FFMPEG.EXPORT_FAILED"; reason: string }
   | { type: "FFMPEG.NOT_LOADED" }
   | { type: "COMMAND.EMPTY_HISTORY" }
   | { type: "COMMAND.INVALID_STATE"; reason: string }
