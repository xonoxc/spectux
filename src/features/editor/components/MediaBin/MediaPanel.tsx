import { useRef, useState } from 'react'
import { useProjectStore } from '../../store/project.store'
import { useImportAsset } from '../../hooks/useAssets'
import { nanoid } from 'nanoid'
import { Upload, Film, Music, Image, MoreVertical } from 'lucide-react'
import { ok } from 'neverthrow'
import { addClip } from '~'
import type { Asset } from '~'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const TYPE_ICONS = { video: Film, audio: Music, image: Image } as const

function AssetThumbnail({ asset }: { asset: Asset }) {
  const Icon = TYPE_ICONS[asset.type]

  return (
    <div className="relative aspect-video overflow-hidden rounded bg-neutral-800">
      {asset.thumbnailUrl ? (
        <img
          src={asset.thumbnailUrl}
          alt={asset.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icon size={18} className="text-neutral-600" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-1 pb-0.5">
        <div className="rounded bg-black/60 p-0.5">
          <Icon size={10} className="text-neutral-300" />
        </div>
        {asset.type !== 'image' && asset.duration > 0 && (
          <span className="rounded bg-black/60 px-1 py-0.5 font-mono text-[9px] text-neutral-300">
            {formatDuration(asset.duration)}
          </span>
        )}
      </div>
    </div>
  )
}

export function MediaPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const projectId = useProjectStore((s) => s.project.id)
  const projectAssets = useProjectStore((s) => s.project.assets)
  const importAsset = useImportAsset()
  const [menuAssetId, setMenuAssetId] = useState<string | null>(null)

  function appendToTimeline(asset: Asset) {
    const store = useProjectStore.getState()
    const tracks = store.project.timeline.tracks
    const videoTrack = tracks.find((t) => t.type === 'video')
    if (!videoTrack) return

    const endTime = videoTrack.clips.reduce(
      (max, c) => Math.max(max, c.timelineStart + (c.end - c.start)),
      0,
    )

    const clipId = nanoid()
    const clip = {
      id: clipId,
      assetId: asset.id,
      start: 0,
      end: Math.min(asset.duration || 10, 30),
      timelineStart: endTime,
      effects: [],
    }

    const result = addClip(videoTrack, clip)
    if (result.isOk()) {
      store.executeCommand({
        type: 'ADD_CLIP',
        execute(p) {
          const newTracks = p.timeline.tracks.map((t) =>
            t.id === videoTrack.id
              ? {
                  ...t,
                  clips: [...t.clips, clip].sort(
                    (a, b) => a.timelineStart - b.timelineStart,
                  ),
                }
              : t,
          )
          return ok({
            ...p,
            timeline: { ...p.timeline, tracks: newTracks },
            updatedAt: Date.now(),
          })
        },
        undo(p) {
          const newTracks = p.timeline.tracks.map((t) =>
            t.id === videoTrack.id
              ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
              : t,
          )
          return ok({
            ...p,
            timeline: { ...p.timeline, tracks: newTracks },
            updatedAt: Date.now(),
          })
        },
        emitEvent() {
          return { type: 'CLIP_ADDED', clip, trackId: videoTrack.id } as const
        },
      })
    }
  }

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
            video.addEventListener('seeked', () => clearTimeout(timeout), {
              once: true,
            })
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

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-8 items-center justify-between border-b border-neutral-800 px-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          Media
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
          title="Import media"
        >
          <Upload size={13} />
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

      <div className="flex-1 overflow-y-auto p-1.5">
        {projectAssets.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-xs text-neutral-600">
              <Upload size={20} className="mx-auto mb-1.5 opacity-50" />
              <p>Import media to begin</p>
            </div>
          </div>
        ) : (
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns:
                'repeat(auto-fill, minmax(90px, 1fr))',
            }}
          >
            {projectAssets.map((asset) => (
              <div key={asset.id} className="group relative">
                <div
                  className="cursor-pointer rounded p-1 transition-colors hover:bg-neutral-800"
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
                  onClick={() => appendToTimeline(asset)}
                >
                  <AssetThumbnail asset={asset} />
                  <p className="mt-0.5 truncate text-[10px] text-neutral-400">
                    {asset.name}
                  </p>
                </div>
                <div className="absolute right-1.5 top-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuAssetId(menuAssetId === asset.id ? null : asset.id)
                    }}
                    className="rounded bg-black/50 p-0.5 text-neutral-300 opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                    style={{ opacity: menuAssetId === asset.id ? 1 : undefined }}
                    title="More"
                  >
                    <MoreVertical size={10} />
                  </button>
                  {menuAssetId === asset.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuAssetId(null)}
                      />
                      <div className="absolute right-0 top-5 z-20 min-w-24 rounded border border-neutral-700 bg-neutral-900 py-1 shadow-lg">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            useProjectStore.getState().inspectAsset(asset.id)
                            setMenuAssetId(null)
                          }}
                          className="flex w-full items-center px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                        >
                          Inspect
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
