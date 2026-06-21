import { err, ok } from "neverthrow"
import { wrap } from "comlink"
import { loadAssetBlob } from "../store/db"

import type { Result } from "neverthrow"
import type { Remote } from "comlink"
import type { Project, EditorError } from "~"
import type { FFmpegWorker } from "../workers/ffmpeg.worker"
import { attempt } from "shared/utils/attempt"

interface ExportAsset {
   id: string
   fileName: string
   blob: ArrayBuffer
}

export interface Renderer {
   export: (project: Project) => Promise<Result<Blob, EditorError>>
   cancel: () => Promise<void>
   onProgress: (callback: (progress: number) => void) => void
}

export function createFFmpegRenderer(): Renderer {
   let workerInstance: Remote<FFmpegWorker> | null = null
   let rawWorker: Worker | null = null
   let progressCallback: ((progress: number) => void) | null = null

   async function getWorker(): Promise<Remote<FFmpegWorker>> {
      if (workerInstance) {
         return workerInstance
      }

      rawWorker = new Worker(new URL("../workers/ffmpeg.worker.ts", import.meta.url), {
         type: "module",
      })

      rawWorker.onmessage = ({ data }) => {
         if (data.type === "progress" && typeof data.progress === "number") {
            progressCallback?.(clamp(data.progress))
         }
      }

      workerInstance = wrap<FFmpegWorker>(rawWorker)

      return workerInstance
   }

   async function collectAssets(project: Project): Promise<Result<ExportAsset[], EditorError>> {
      const assetFiles = new Map(project.assets.map(asset => [asset.id, asset.fileName]))

      const exportAssets: ExportAsset[] = []

      const clips = project.timeline.tracks.flatMap(track => track.clips)

      for (const clip of clips) {
         if (exportAssets.some(asset => asset.id === clip.assetId)) {
            continue
         }

         const fileName = assetFiles.get(clip.assetId)

         if (!fileName) {
            return err({
               type: "ASSET.NOT_FOUND",
               assetId: clip.assetId,
            })
         }

         const blobRes = await attempt(loadAssetBlob(clip.assetId))
         if (blobRes.isErr() || !blobRes.value) {
            return err({
               type: "ASSET.NOT_FOUND",
               assetId: clip.assetId,
            })
         }

         const bufferRes = await attempt(blobRes.value.arrayBuffer())
         if (bufferRes.isErr()) {
            return err({
               type: "ASSET.NOT_FOUND",
               assetId: clip.assetId,
            })
         }

         exportAssets.push({
            id: clip.assetId,
            fileName,
            blob: bufferRes.value,
         })

         progressCallback?.(0.08)
      }

      return ok(exportAssets)
   }

   return {
      onProgress(callback) {
         progressCallback = callback
      },

      async export(project) {
         progressCallback?.(0.01)

         const workerRes = await attempt(getWorker())

         if (workerRes.isErr()) {
            return ffmpegError(workerRes.error)
         }

         const worker = workerRes.value

         progressCallback?.(0.03)

         const loadRes = await attempt(worker.load())

         if (loadRes.isErr()) {
            return ffmpegError(loadRes.error)
         }

         progressCallback?.(0.05)

         const assetsRes = await collectAssets(project)

         if (assetsRes.isErr()) {
            return err(assetsRes.error)
         }

         const renderRes = await attempt(
            worker.exportVideo({
               id: project.id,

               assets: assetsRes.value,

               tracks: project.timeline.tracks.map(track => ({
                  id: track.id,
                  type: track.type,

                  clips: track.clips.map(clip => ({
                     assetId: clip.assetId,
                     start: clip.start,
                     end: clip.end,
                     timelineStart: clip.timelineStart,
                     muted: clip.muted,
                     volume: clip.volume,
                     type: clip.type,
                  })),
               })),
            })
         )

         if (renderRes.isErr()) {
            return ffmpegError(renderRes.error)
         }

         progressCallback?.(1)

         return ok(
            new Blob([renderRes.value as BlobPart], {
               type: "video/mp4",
            })
         )
      },

      async cancel() {
         const cancelRes = workerInstance ? await attempt(workerInstance.cancel()) : null

         workerInstance = null

         rawWorker?.terminate()
         rawWorker = null

         if (cancelRes?.isErr()) {
            console.warn("Failed to cancel worker", cancelRes.error)
         }
      },
   }
}

function ffmpegError<T>(error: unknown): Result<T, EditorError> {
   return err({
      type: "FFMPEG.EXPORT_FAILED",

      reason: error instanceof Error ? error.message : String(error),
   })
}

function clamp(value: number) {
   return Math.max(0, Math.min(1, value))
}
