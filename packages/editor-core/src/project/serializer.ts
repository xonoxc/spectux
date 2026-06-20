import { err, ok } from 'neverthrow'
import type { Result } from 'neverthrow'
import { z } from 'zod'
import type { Project } from './Project'
import type { EditorError } from '../errors/errors'

const EffectSchema = z.object({
  id: z.string(),
  type: z.string(),
  params: z.record(z.string(), z.unknown()),
})

const ClipSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
  timelineStart: z.number().min(0),
  effects: z.array(EffectSchema),
})

const TrackSchema = z.object({
  id: z.string(),
  type: z.enum(['video', 'audio']),
  clips: z.array(ClipSchema),
})

const AssetSchema = z.object(
  {
    id: z.string(),
    name: z.string(),
    type: z.enum(['video', 'audio', 'image']),
    duration: z.number().min(0),
    fileName: z.string(),
    mimeType: z.string(),
    size: z.number().min(0),
    importedAt: z.number().min(0),
  },
  { message: 'Invalid asset' },
)

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  timeline: z.object({
    tracks: z.array(TrackSchema),
  }),
  assets: z.array(AssetSchema),
  createdAt: z.number().min(0),
  updatedAt: z.number().min(0),
})

export type ProjectJSON = z.infer<typeof ProjectSchema>

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export function deserializeProject(json: string): Result<Project, EditorError> {
  try {
    const parsed = JSON.parse(json)
    const result = ProjectSchema.safeParse(parsed)

    if (!result.success) {
      const issue = result.error.issues[0]
      return err({
        type: 'PROJECT.INVALID_DATA',
        path: issue.path.join('.'),
        reason: issue.message,
      })
    }

    return ok(result.data)
  } catch {
    return err({
      type: 'PROJECT.INVALID_DATA',
      path: 'root',
      reason: 'Invalid JSON',
    })
  }
}
