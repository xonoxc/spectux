interface PlayheadProps {
  position: number
}

export function Playhead({ position }: PlayheadProps) {
  if (position < 0) return null

  return (
    <div
      className="pointer-events-none absolute top-0 z-20 h-full"
      style={{ left: position }}
    >
      <div className="h-2.5 w-2.5 -translate-x-1/2 rounded-sm bg-red-500" />
      <div className="mx-auto w-px flex-1 bg-red-500" />
    </div>
  )
}
