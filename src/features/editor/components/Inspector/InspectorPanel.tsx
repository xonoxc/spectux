import { X } from 'lucide-react'
import { useInspectorPanel } from '#/features/editor/hooks/client-state/useInspector'

export function InspectorPanel() {
  const { closeInspector, selectedClip, inspectedAsset } = useInspectorPanel()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          {inspectedAsset ? 'Asset' : 'Inspector'}
        </span>
        <button
          onClick={closeInspector}
          className="rounded p-0.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
          title="Close"
        >
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {inspectedAsset && <AssetProperties asset={inspectedAsset} />}
        {!inspectedAsset && !selectedClip && (
          <p className="text-center text-xs text-neutral-600">
            Select a clip or inspect an asset
          </p>
        )}
        {!inspectedAsset && selectedClip?.isOk() && (
          <ClipProperties
            clip={selectedClip.value.clip}
            track={selectedClip.value.track}
          />
        )}
      </div>
    </div>
  )
}

interface AssetProps {
  asset: {
    id: string
    name: string
    type: string
    duration: number
    size: number
    mimeType: string
    fileName: string
  }
}

function AssetProperties({ asset }: AssetProps) {
  const sizeLabel =
    asset.size > 1024 * 1024
      ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(asset.size / 1024).toFixed(1)} KB`

  return (
    <div className="space-y-3">
      <Section title="Asset">
        <Property label="Name" value={asset.name} />
        <Property label="Type" value={asset.type} />
        <Property label="File" value={asset.fileName} />
        <Property label="MIME" value={asset.mimeType} />
      </Section>
      <Section title="Properties">
        <Property label="Duration" value={`${asset.duration.toFixed(2)}s`} />
        <Property label="Size" value={sizeLabel} />
      </Section>
    </div>
  )
}

function ClipProperties({
  clip,
  track,
}: {
  clip: {
    id: string
    assetId: string
    start: number
    end: number
    timelineStart: number
  }
  track: { id: string; type: string }
}) {
  return (
    <div className="space-y-3">
      <Section title="Clip">
        <Property label="ID" value={clip.id} />
        <Property label="Track" value={`${track.id} (${track.type})`} />
      </Section>
      <Section title="Timing">
        <Property
          label="Timeline Start"
          value={`${clip.timelineStart.toFixed(2)}s`}
        />
        <Property label="Source Start" value={`${clip.start.toFixed(2)}s`} />
        <Property label="Source End" value={`${clip.end.toFixed(2)}s`} />
        <Property
          label="Duration"
          value={`${(clip.end - clip.start).toFixed(2)}s`}
        />
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Property({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="max-w-35 truncate font-mono text-xs text-neutral-300">
        {value}
      </span>
    </div>
  )
}
