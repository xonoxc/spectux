import { useMemo } from 'react'

interface TimeRulerProps {
  duration: number
  pixelsPerSecond: number
}

export function TimeRuler({ duration, pixelsPerSecond }: TimeRulerProps) {
  const marks = useMemo(() => {
    const step = getRulerStep(pixelsPerSecond)
    const result: { time: number; x: number; label: string }[] = []

    for (let t = 0; t <= duration; t += step) {
      const m = Math.floor(t / 60)
      const s = Math.floor(t % 60)
      result.push({
        time: t,
        x: t * pixelsPerSecond,
        label: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
      })
    }

    return result
  }, [duration, pixelsPerSecond])

  return (
    <div
      className="relative h-7 border-b border-neutral-800 bg-neutral-900 select-none"
      style={{ minWidth: duration * pixelsPerSecond }}
    >
      {marks.map((mark) => (
        <div
          key={mark.time}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: mark.x }}
        >
          <div className="h-2 w-px bg-neutral-700" />
          <span className="mt-0.5 text-[9px] text-neutral-500">
            {mark.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function getRulerStep(pixelsPerSecond: number): number {
  if (pixelsPerSecond >= 100) return 1
  if (pixelsPerSecond >= 50) return 2
  if (pixelsPerSecond >= 20) return 5
  return 10
}
