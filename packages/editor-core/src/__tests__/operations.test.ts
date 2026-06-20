import { describe, it, expect } from 'vitest'
import { createProject } from '../project/Project'
import { createClip } from '../timeline/Clip'
import { addTrack } from '../timeline/Timeline'
import { addClip } from '../timeline/Track'
import { splitClip } from '../operations/splitClip'
import { moveClipToTime } from '../operations/moveClip'
import { trimClipOperation } from '../operations/trimClip'

function makeTestProject() {
  const project = createProject({ id: 'test', name: 'Test' })
  const withTrack = addTrack(project.timeline, 'video', 'track-1')
  if (withTrack.isErr()) throw new Error('Failed to create track')
  return { ...project, timeline: withTrack.value }
}

function makeTestClip() {
  return createClip({
    id: 'clip-1',
    assetId: 'asset-1',
    start: 0,
    end: 10,
    timelineStart: 0,
  })
}

describe('splitClip operation', () => {
  it('splits a clip at the given time', () => {
    let project = makeTestProject()
    const clip = makeTestClip()
    const withClip = addClip(project.timeline.tracks[0], clip)
    if (withClip.isErr()) throw new Error('Failed to add clip')
    project = {
      ...project,
      timeline: {
        ...project.timeline,
        tracks: project.timeline.tracks.map((t) =>
          t.id === 'track-1' ? withClip.value : t,
        ),
      },
    }

    const result = splitClip(project, 'clip-1', 4)
    expect(result.isOk()).toBe(true)
    if (result.isErr()) return

    const tracks = result.value.timeline.tracks
    expect(tracks[0].clips.length).toBe(2)
    expect(tracks[0].clips[0].id).toBe('clip-1')
    expect(tracks[0].clips[0].end).toBe(4)
    expect(tracks[0].clips[1].id).toBe('clip-1-split')
    expect(tracks[0].clips[1].start).toBe(4)
    expect(tracks[0].clips[1].timelineStart).toBe(4)
  })

  it('fails when splitting at timeline start', () => {
    let project = makeTestProject()
    const clip = makeTestClip()
    const withClip = addClip(project.timeline.tracks[0], clip)
    if (withClip.isErr()) throw new Error('Failed to add clip')
    project = {
      ...project,
      timeline: {
        ...project.timeline,
        tracks: project.timeline.tracks.map((t) =>
          t.id === 'track-1' ? withClip.value : t,
        ),
      },
    }

    const result = splitClip(project, 'clip-1', 0)
    expect(result.isErr()).toBe(true)
    if (result.isOk()) return
    expect(result.error.type).toBe('TIMELINE.INVALID_SPLIT')
  })

  it('fails when clip not found', () => {
    const project = makeTestProject()
    const result = splitClip(project, 'nonexistent', 5)
    expect(result.isErr()).toBe(true)
    if (result.isOk()) return
    expect(result.error.type).toBe('TIMELINE.CLIP_NOT_FOUND')
  })
})

describe('moveClip operation', () => {
  it('moves a clip to a new timeline position', () => {
    let project = makeTestProject()
    const clip = makeTestClip()
    const withClip = addClip(project.timeline.tracks[0], clip)
    if (withClip.isErr()) throw new Error('Failed to add clip')
    project = {
      ...project,
      timeline: {
        ...project.timeline,
        tracks: project.timeline.tracks.map((t) =>
          t.id === 'track-1' ? withClip.value : t,
        ),
      },
    }

    const result = moveClipToTime(project, 'clip-1', 15)
    expect(result.isOk()).toBe(true)
    if (result.isErr()) return

    const movedClip = result.value.timeline.tracks[0].clips[0]
    expect(movedClip.timelineStart).toBe(15)
  })

  it('fails when moving to negative time', () => {
    let project = makeTestProject()
    const clip = makeTestClip()
    const withClip = addClip(project.timeline.tracks[0], clip)
    if (withClip.isErr()) throw new Error('Failed to add clip')
    project = {
      ...project,
      timeline: {
        ...project.timeline,
        tracks: project.timeline.tracks.map((t) =>
          t.id === 'track-1' ? withClip.value : t,
        ),
      },
    }

    const result = moveClipToTime(project, 'clip-1', -5)
    expect(result.isErr()).toBe(true)
    if (result.isOk()) return
    expect(result.error.type).toBe('TIMELINE.CLIP_OUT_OF_BOUNDS')
  })
})

describe('trimClip operation', () => {
  it('trims the start of a clip', () => {
    let project = makeTestProject()
    const clip = makeTestClip()
    const withClip = addClip(project.timeline.tracks[0], clip)
    if (withClip.isErr()) throw new Error('Failed to add clip')
    project = {
      ...project,
      timeline: {
        ...project.timeline,
        tracks: project.timeline.tracks.map((t) =>
          t.id === 'track-1' ? withClip.value : t,
        ),
      },
    }

    const result = trimClipOperation(project, 'clip-1', 2, 10)
    expect(result.isOk()).toBe(true)
    if (result.isErr()) return

    const trimmed = result.value.timeline.tracks[0].clips[0]
    expect(trimmed.start).toBe(2)
    expect(trimmed.end).toBe(10)
  })

  it('fails when start >= end', () => {
    let project = makeTestProject()
    const clip = makeTestClip()
    const withClip = addClip(project.timeline.tracks[0], clip)
    if (withClip.isErr()) throw new Error('Failed to add clip')
    project = {
      ...project,
      timeline: {
        ...project.timeline,
        tracks: project.timeline.tracks.map((t) =>
          t.id === 'track-1' ? withClip.value : t,
        ),
      },
    }

    const result = trimClipOperation(project, 'clip-1', 8, 5)
    expect(result.isErr()).toBe(true)
    if (result.isOk()) return
    expect(result.error.type).toBe('TIMELINE.INVALID_TRIM')
  })
})
