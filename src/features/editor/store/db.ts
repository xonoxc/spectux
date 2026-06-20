import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { Project, Asset } from '~'

export interface ProjectRecord {
  id: string
  name: string
  data: string
  createdAt: number
  updatedAt: number
}

export interface AssetRecord {
  id: string
  projectId: string
  name: string
  type: 'video' | 'audio' | 'image'
  duration: number
  fileName: string
  mimeType: string
  size: number
  blob: Blob
  importedAt: number
}

class EditorDB extends Dexie {
  projects!: Table<ProjectRecord, string>
  assets!: Table<AssetRecord, string>

  constructor() {
    super('spectux-editor')
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      assets: 'id, projectId, type, importedAt',
    })
  }
}

export const db = new EditorDB()

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put({
    id: project.id,
    name: project.name,
    data: JSON.stringify(project),
    createdAt: project.createdAt,
    updatedAt: Date.now(),
  })
}

export async function loadProject(id: string): Promise<Project | null> {
  const record = await db.projects.get(id)
  if (!record) return null
  return JSON.parse(record.data) as Project
}

export async function saveAssetBlob(
  asset: Asset,
  projectId: string,
  blob: Blob,
): Promise<void> {
  await db.assets.put({
    id: asset.id,
    projectId,
    name: asset.name,
    type: asset.type,
    duration: asset.duration,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    size: asset.size,
    blob,
    importedAt: asset.importedAt,
  })
}

export async function loadAssetBlob(assetId: string): Promise<Blob | null> {
  const record = await db.assets.get(assetId)
  if (!record) return null
  return record.blob
}

export async function deleteAssetBlob(assetId: string): Promise<void> {
  await db.assets.delete(assetId)
}

export async function listProjects(): Promise<ProjectRecord[]> {
  return db.projects.orderBy('updatedAt').reverse().toArray()
}

export async function listProjectAssets(
  projectId: string,
): Promise<AssetRecord[]> {
  return db.assets
    .where('projectId')
    .equals(projectId)
    .reverse()
    .sortBy('importedAt')
}
