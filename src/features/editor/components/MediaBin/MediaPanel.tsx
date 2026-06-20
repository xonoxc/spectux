import { useRef } from 'react'
import { useProjectStore } from '../../store/project.store'
import { useImportAsset } from '../../hooks/useAssets'
import { nanoid } from 'nanoid'
import { Upload, Film, Music, Image } from 'lucide-react'
import { ok } from 'neverthrow'
import type { Asset } from '#/../packages/editor-core/src'

export function MediaPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const projectId = useProjectStore((s) => s.project.id)
  const projectAssets = useProjectStore((s) => s.project.assets)
  const importAsset = useImportAsset()

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const store = useProjectStore.getState()

    for (const file of files) {
      const type = file.type.startsWith('video')
        ? ('video' as const)
        : file.type.startsWith('audio')
          ? ('audio' as const)
          : ('image' as const)

      const asset: Asset = {
        id: nanoid(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        type,
        duration: 0,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        importedAt: Date.now(),
      }

      const url = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.preload = 'metadata'
      video.src = url

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          asset.duration = video.duration
          resolve()
        }
        video.onerror = () => resolve()
      })

      if (type === 'video' && asset.duration > 0) {
        try {
          video.currentTime = Math.min(0.5, asset.duration / 2)
          await new Promise<void>((resolve) => {
            video.onseeked = () => resolve()
            const timeout = setTimeout(resolve, 1000)
            video.addEventListener('seeked', () => clearTimeout(timeout), { once: true })
          })
          const canvas = document.createElement('canvas')
          canvas.width = 160
          canvas.height = 90
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, 160, 90)
            asset.thumbnailUrl = canvas.toDataURL('image/jpeg', 0.6)
          }
        } catch {
          // thumbnail generation failed — skip
        }
      }

      URL.revokeObjectURL(url)

      store.executeCommand({
        type: 'IMPORT_ASSET',
        execute(p) {
          return ok({
            ...p,
            assets: [...p.assets, asset],
            updatedAt: Date.now(),
          })
        },
        undo(p) {
          return ok({
            ...p,
            assets: p.assets.filter((a) => a.id !== asset.id),
            updatedAt: Date.now(),
          })
        },
        emitEvent() {
          return { type: 'ASSET_IMPORTED', asset } as const
        },
      })

      await importAsset.mutateAsync({ asset, projectId, blob: file })
    }

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const TypeIcon = {
    video: Film,
    audio: Music,
    image: Image,
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Media
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          title="Import media"
        >
          <Upload size={14} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          multiple
          className="hidden"
          onChange={handleFileImport}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {projectAssets.length === 0 && (
          <div className="mt-8 text-center text-xs text-neutral-600">
            <Upload size={24} className="mx-auto mb-2 opacity-50" />
            <p>Drop or click to import</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {projectAssets.map((asset) => {
            const Icon = TypeIcon[asset.type]
            return (
              <div
                key={asset.id}
                className="cursor-grab rounded border border-neutral-800 bg-neutral-900 p-2 transition-colors hover:border-neutral-700 active:cursor-grabbing"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/x-spectux-asset',
                    JSON.stringify({
                      assetId: asset.id,
                      duration: asset.duration,
                    }),
                  )
                }}
              >
                <div className="mb-1 flex aspect-video items-center justify-center overflow-hidden rounded bg-neutral-800">
                  {asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icon size={20} className="text-neutral-500" />
                  )}
                </div>
                <p className="truncate text-xs text-neutral-300">
                  {asset.name}
                </p>
                <p className="text-[10px] text-neutral-600">
                  {asset.duration.toFixed(1)}s
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
