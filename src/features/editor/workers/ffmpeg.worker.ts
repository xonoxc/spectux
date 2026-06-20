import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { expose } from 'comlink'

let ffmpeg: FFmpeg | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg()
  }
  return ffmpeg
}

export interface ExportClip {
  assetId: string
  start: number
  end: number
  timelineStart: number
}

export interface ExportTrack {
  id: string
  type: 'video' | 'audio'
  clips: ExportClip[]
}

export interface ExportProject {
  id: string
  tracks: ExportTrack[]
  assets: Array<{
    id: string
    fileName: string
    blob: ArrayBuffer
  }>
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function clipDuration(clip: ExportClip): number {
  return clip.end - clip.start
}

function getVideoClips(project: ExportProject): ExportClip[] {
  return project.tracks
    .filter((track) => track.type === 'video')
    .flatMap((track) => track.clips)
    .filter((clip) => clipDuration(clip) > 0)
    .sort((a, b) => a.timelineStart - b.timelineStart)
}

async function load() {
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  const instance = await getFFmpeg()

  if (!instance.loaded) {
    await instance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm',
      ),
    })
  }
}

async function exportVideo(project: ExportProject): Promise<Uint8Array> {
  const instance = await getFFmpeg()
  await load()

  try {
    await instance.deleteFile('output.mp4')
  } catch {}

  const inputNames: string[] = []
  const assetIndex = new Map<string, number>()

  project.assets.forEach((asset, i) => {
    const name = `input_${i}_${sanitizeFileName(asset.fileName)}`
    inputNames.push(name)
    assetIndex.set(asset.id, i)
  })

  for (let i = 0; i < project.assets.length; i++) {
    await instance.writeFile(
      inputNames[i],
      new Uint8Array(project.assets[i].blob),
    )
  }

  const filterParts: string[] = []
  const clips = getVideoClips(project)

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const inputIdx = assetIndex.get(clip.assetId)
    if (inputIdx === undefined) continue
    filterParts.push(
      `[${inputIdx}:v]trim=start=${clip.start}:end=${clip.end},setpts=PTS-STARTPTS,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[seg${i}]`,
    )
  }

  if (filterParts.length === 0) {
    throw new Error('No video clips to export')
  }

  const concatInputs = Array.from(
    { length: filterParts.length },
    (_, i) => `[seg${i}]`,
  ).join('')
  const filterComplex = filterParts.join(';\n')

  const args = [
    ...inputNames.flatMap((name) => ['-i', name]),
    '-filter_complex',
    `${filterComplex};${concatInputs}concat=n=${filterParts.length}:v=1:a=0[out]`,
    '-map',
    '[out]',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-movflags',
    '+faststart',
    '-y',
    'output.mp4',
  ]

  instance.on('progress', ({ progress }) => {
    if (typeof progress === 'number') {
      self.postMessage({ type: 'progress', progress })
    }
  })

  const exitCode = await instance.exec(args)
  if (exitCode !== 0) {
    throw new Error(`FFmpeg export failed with exit code ${exitCode}`)
  }

  const data = await instance.readFile('output.mp4')
  if (typeof data === 'string') {
    throw new Error('FFmpeg produced text output instead of video data')
  }
  if (data.byteLength === 0) {
    throw new Error('FFmpeg produced an empty output file')
  }
  return data
}

async function cancel() {
  if (ffmpeg) {
    ffmpeg.terminate()
    ffmpeg = null
  }
}

const exports = { load, exportVideo, cancel }
export type FFmpegWorker = typeof exports

expose(exports)
