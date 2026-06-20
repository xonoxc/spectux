import { attempt } from 'shared/utils/attempt'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { expose } from 'comlink'

let ffmpeg: FFmpeg | null = null

function reportProgress(progress: number) {
  self.postMessage({
    type: 'progress',
    progress: Math.max(0, Math.min(1, progress)),
  })
}

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
  muted: boolean
  volume: number
  type: 'video' | 'audio'
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
    .filter((clip) => clip.type === 'video' && clipDuration(clip) > 0)
    .sort((a, b) => a.timelineStart - b.timelineStart)
}

function getAudioClips(project: ExportProject): ExportClip[] {
  return project.tracks
    .filter((track) => track.type === 'audio')
    .flatMap((track) => track.clips)
    .filter((clip) => clip.type === 'audio' && clipDuration(clip) > 0)
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
  reportProgress(0.05)

  await attempt(instance.deleteFile('output.mp4'))

  const logMessages: string[] = []
  instance.on('log', ({ message }) => {
    logMessages.push(message)
    if (logMessages.length > 200) logMessages.shift()
  })

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
    reportProgress(0.05 + ((i + 1) / project.assets.length) * 0.15)
  }

  const inputsWithAudio = new Set<number>()
  for (let i = 0; i < project.assets.length; i++) {
    logMessages.length = 0
    await instance.exec(['-i', inputNames[i], '-f', 'null', '-', '-loglevel', 'info'])
    const hasAudio = logMessages.some(
      (m) => /^\s*Stream.*Audio/.test(m) || /Stream #0:.*Audio/.test(m),
    )
    if (hasAudio) inputsWithAudio.add(i)
  }
  logMessages.length = 0

  const videoClips = getVideoClips(project)
  const audioClips = getAudioClips(project)

  if (videoClips.length === 0) {
    throw new Error('No video clips to export')
  }

  const filterParts: string[] = []

  for (let i = 0; i < videoClips.length; i++) {
    const clip = videoClips[i]
    const inputIdx = assetIndex.get(clip.assetId)
    if (inputIdx === undefined) continue

    filterParts.push(
      `[${inputIdx}:v]trim=start=${clip.start}:end=${clip.end},setpts=PTS-STARTPTS,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[segV${i}]`,
    )
  }

  const videoCount = videoClips.length
  let audioStreamCount = 0

  const audioFilterNames: string[] = []

  for (let i = 0; i < videoClips.length; i++) {
    const clip = videoClips[i]
    const inputIdx = assetIndex.get(clip.assetId)
    if (inputIdx === undefined) continue
    if (clip.muted || clipDuration(clip) <= 0) continue
    if (!inputsWithAudio.has(inputIdx)) continue

    const delay = Math.round(clip.timelineStart * 1000)
    filterParts.push(
      `[${inputIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${clip.volume},atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS,adelay=${delay}|${delay}[audV${i}]`,
    )
    audioFilterNames.push(`[audV${i}]`)
    audioStreamCount++
  }

  for (let j = 0; j < audioClips.length; j++) {
    const clip = audioClips[j]
    const inputIdx = assetIndex.get(clip.assetId)
    if (inputIdx === undefined) continue
    if (clip.muted || clipDuration(clip) <= 0) continue
    if (!inputsWithAudio.has(inputIdx)) continue

    const delay = Math.round(clip.timelineStart * 1000)
    filterParts.push(
      `[${inputIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${clip.volume},atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS,adelay=${delay}|${delay}[audA${j}]`,
    )
    audioFilterNames.push(`[audA${j}]`)
    audioStreamCount++
  }

  const concatInputs = Array.from(
    { length: videoCount },
    (_, i) => `[segV${i}]`,
  ).join('')

  let filterComplex = filterParts.join(';\n')

  if (videoCount > 0) {
    if (audioStreamCount > 0) {
      filterComplex += `;\n${concatInputs}concat=n=${videoCount}:v=1:a=0[outv]`
      const mixInputs = audioFilterNames.join('')
      filterComplex += `;\n${mixInputs}amix=inputs=${audioStreamCount}:duration=longest:dropout_transition=0[outa]`
    } else {
      filterComplex += `;\n${concatInputs}concat=n=${videoCount}:v=1:a=0[outv]`
    }
  }

  const args = [
    ...inputNames.flatMap((name) => ['-i', name]),
    '-filter_complex',
    filterComplex,
    '-map',
    '[outv]',
  ]

  if (audioStreamCount > 0) {
    args.push('-map', '[outa]', '-c:a', 'aac', '-b:a', '192k')
  } else {
    args.push('-an')
  }

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-movflags',
    '+faststart',
    '-loglevel',
    'warning',
    '-y',
    'output.mp4',
  )

  instance.on('progress', ({ progress }) => {
    if (typeof progress === 'number') {
      reportProgress(0.2 + progress * 0.75)
    }
  })

  reportProgress(0.2)
  const exitCode = await instance.exec(args)

  if (exitCode !== 0) {
    const lastLogs = logMessages.slice(-30).join('\n')
    throw new Error(`FFmpeg exit code ${exitCode}.\n${lastLogs}`)
  }

  const data = await instance.readFile('output.mp4')
  if (typeof data === 'string') {
    throw new Error('FFmpeg produced text output instead of video data')
  }
  if (data.byteLength === 0) {
    throw new Error('FFmpeg produced an empty output file')
  }
  reportProgress(1)
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
