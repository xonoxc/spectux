import { describe, expect, it } from "vitest"
import { getClipAtTime, getNextClipAfterTime, timelineToAssetTime } from "./TimelinePlayer"
import type { ClipSegment } from "./TimelinePlayer"

const segments: ClipSegment[] = [
   {
      clipId: "clip-a",
      assetId: "asset-a",
      timelineStart: 0,
      timelineEnd: 9,
      assetStart: 0,
      assetEnd: 9,
      type: "video",
      muted: false,
      volume: 1,
   },
   {
      clipId: "clip-b",
      assetId: "asset-b",
      timelineStart: 9,
      timelineEnd: 18,
      assetStart: 9,
      assetEnd: 18,
      type: "video",
      muted: false,
      volume: 1,
   },
]

describe("TimelinePlayer timeline mapping", () => {
   it("finds clips by timeline boundaries", () => {
      expect(getClipAtTime(segments, 0)?.clipId).toBe("clip-a")
      expect(getClipAtTime(segments, 8.99)?.clipId).toBe("clip-a")
      expect(getClipAtTime(segments, 9)?.clipId).toBe("clip-b")
      expect(getClipAtTime(segments, 18)).toBeNull()
   })

   it("finds the next clip after a boundary overshoot", () => {
      expect(getNextClipAfterTime(segments, 9)?.clipId).toBe("clip-b")
      expect(getNextClipAfterTime(segments, 9.01)?.clipId).toBe("clip-b")
      expect(getNextClipAfterTime(segments, 18)).toBeNull()
   })

   it("maps timeline time to asset time", () => {
      expect(timelineToAssetTime(segments[0], 4)).toBe(4)
      expect(timelineToAssetTime(segments[1], 9)).toBe(9)
      expect(timelineToAssetTime(segments[1], 13.5)).toBe(13.5)
   })
})
