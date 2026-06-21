import { createTimeline } from "../timeline/Timeline"
import type { Timeline } from "../timeline/Timeline"

export interface Asset {
   id: string
   name: string
   type: "video" | "audio" | "image"
   duration: number
   fileName: string
   mimeType: string
   size: number
   importedAt: number
   thumbnailUrl?: string
}

export interface Project {
   id: string
   name: string
   timeline: Timeline
   assets: Asset[]
   createdAt: number
   updatedAt: number
}

export function createProject(params: { id: string; name: string }): Project {
   const now = Date.now()
   return {
      id: params.id,
      name: params.name,
      timeline: createTimeline(),
      assets: [],
      createdAt: now,
      updatedAt: now,
   }
}

export function getAsset(project: Project, assetId: string): Asset | undefined {
   return project.assets.find(a => a.id === assetId)
}
