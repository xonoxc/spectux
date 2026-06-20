import { useProjectStore } from '../../store/project.store'
import { findClip } from '~'

export function InspectorPanel() {
  const project = useProjectStore((s) => s.project)
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds)

  const selectedClip =
    selectedClipIds.length === 1
      ? findClip(project.timeline, selectedClipIds[0])
      : null

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Inspector
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {!selectedClip && (
          <p className="text-center text-xs text-neutral-600">
            Select a clip to inspect
          </p>
        )}
        {selectedClip?.isOk() && (
          <ClipProperties
            clip={selectedClip.value.clip}
            track={selectedClip.value.track}
          />
        )}
      </div>
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
      <span className="max-w-[140px] truncate font-mono text-xs text-neutral-300">
        {value}
      </span>
    </div>
  )
}
