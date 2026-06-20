import { err, ok } from 'neverthrow'
import { wrap } from 'comlink'
import { loadAssetBlob } from '../store/db'

import type { Result } from 'neverthrow'
import type { Remote } from 'comlink'
import type { Project, EditorError } from '~'
import type { FFmpegWorker } from '../workers/ffmpeg.worker'

export interface Renderer {
  export: (project: Project) => Promise<Result<Blob, EditorError>>
  cancel: () => Promise<void>
  onProgress: (callback: (progress: number) => void) => void
}

export function createFFmpegRenderer(): Renderer {
  let workerInstance: Remote<FFmpegWorker> | null = null
  let rawWorker: Worker | null = null

  async function getWorker(): Promise<Remote<FFmpegWorker>> {
    if (!workerInstance) {
      rawWorker = new Worker(
        new URL('../workers/ffmpeg.worker.ts', import.meta.url),
        { type: 'module' },
      )
      workerInstance = wrap<FFmpegWorker>(rawWorker)
    }
    return workerInstance
  }

  return {
    onProgress(_callback: (progress: number) => void) {},

    async export(project: Project): Promise<Result<Blob, EditorError>> {
      try {
        const instance = await getWorker()
        await instance.load()

        const assetBlobs: Array<{
          id: string
          fileName: string
          blob: ArrayBuffer
        }> = []

        const assetMap = new Map<string, { id: string; fileName: string }>()
        for (const asset of project.assets) {
          assetMap.set(asset.id, { id: asset.id, fileName: asset.fileName })
        }

        for (const track of project.timeline.tracks) {
          for (const clip of track.clips) {
            if (!assetMap.has(clip.assetId)) {
              return err({
                type: 'ASSET.NOT_FOUND',
                assetId: clip.assetId,
              })
            }

            const existing = assetBlobs.find((a) => a.id === clip.assetId)
            if (!existing) {
              const assetInfo = assetMap.get(clip.assetId)!
              const blob = await loadAssetBlob(clip.assetId)
              if (!blob) {
                return err({
                  type: 'ASSET.NOT_FOUND',
                  assetId: clip.assetId,
                })
              }
              assetBlobs.push({
                id: clip.assetId,
                fileName: assetInfo.fileName,
                blob: await blob.arrayBuffer(),
              })
            }
          }
        }

        const exportProject = {
          id: project.id,
          tracks: project.timeline.tracks.map((t) => ({
            id: t.id,
            type: t.type,
            clips: t.clips.map((c) => ({
              assetId: c.assetId,
              start: c.start,
              end: c.end,
              timelineStart: c.timelineStart,
            })),
          })),
          assets: assetBlobs,
        }

        const result = await instance.exportVideo(exportProject)

        return ok(new Blob([result as BlobPart], { type: 'video/mp4' }))
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e)
        return err({ type: 'FFMPEG.EXPORT_FAILED', reason })
      }
    },

    async cancel() {
      if (workerInstance) {
        await workerInstance.cancel()
        workerInstance = null
      }
      if (rawWorker) {
        rawWorker.terminate()
        rawWorker = null
      }
    },
  }
}
