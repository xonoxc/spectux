# Spectux

**Spectux** is a browser-native non-linear video editor built around a modern client-side architecture.

The goal of Spectux is to bring desktop-style video editing workflows into the browser using WebAssembly, Web Workers, and a dedicated timeline engine.

It is not a video converter.

Spectux treats editing as a project document:

- edits are non-destructive
- timeline operations are deterministic
- rendering happens only during export

---

## Vision

Traditional video editors separate the editor engine from the interface.

Spectux follows the same idea:

```
React UI
    |
    v
State Machines
    |
    v
Command Engine
    |
    v
Timeline Core
    |
    v
Renderer Adapter
    |
    v
FFmpeg WASM
```

React displays the editor.

The core owns the editing logic.

---

# Version 0.1 Goal

The first milestone focuses on a complete editing pipeline:

```
Import Video
      ↓
Timeline Editing
      ↓
Realtime Preview
      ↓
Export Video
```

No feature bloat.

One polished workflow.

---

# Features Roadmap

## Project System

- [x] Create new project
- [x] Store project metadata
- [x] Save project locally
- [x] Reload existing projects
- [x] Serialize timeline document

Storage:

- IndexedDB
- Project JSON
- Asset blobs

---

## Media System

- [x] Import MP4 files
- [ ] Drag/drop upload support
- [x] Store media assets locally
- [x] Generate asset metadata

Asset model:

```ts
Asset {
  id: string

  name: string

  type: "video"

  duration: number

  blobId: string
}
```

Not included in v0.1:

- cloud storage
- media folders
- asset search

---

## Preview Engine

Realtime preview without rendering.

Powered by:

- HTMLVideoElement
- Browser APIs

Features:

- [ ] Play video
- [ ] Pause video
- [x] Seek timeline
- [x] Display current timestamp
- [x] Sync playhead

Not included:

- realtime effects
- transitions
- WebGL rendering

---

# Timeline Engine

The heart of Spectux.

Timeline data is time-based, never pixel-based.

Bad:

```ts
clip.x = 500
clip.width = 200
```

Good:

```ts
Clip {
  timelineStart:number

  start:number

  end:number
}
```

Pixels are calculated:

```ts
position = time * zoom
```

## Timeline v0.1

- [x] Single video track
- [x] Timeline ruler
- [x] Playhead
- [x] Clip selection

Editing:

- [x] Move clips
- [x] Trim clip start/end
- [x] Split clip at playhead
- [x] Delete clips

Future:

- Multiple tracks
- Effects
- Transitions
- Keyframes

---

# Command System

All destructive operations pass through commands.

Example:

```
User Action

    ↓

MoveClipCommand

    ↓

Timeline Update
```

Enables:

- undo
- redo
- history tracking

Commands:

- [x] MoveClipCommand

- [x] TrimClipCommand

- [x] SplitClipCommand

- [x] DeleteClipCommand

History:

- [x] Undo support
- [x] Redo support

---

# Rendering Engine

FFmpeg WASM is used only for final export.

Flow:

```
Project JSON

     ↓

Command Builder

     ↓

FFmpeg Worker

     ↓

MP4 Output
```

Features:

- [x] Load FFmpeg WASM
- [x] Generate render commands
- [x] Export edited timeline
- [ ] Progress reporting

Supported v0.1 operations:

- trimming
- split clip rendering
- concatenation

---

# State Architecture

Spectux separates state by responsibility.

## XState

Workflow state:

```
idle

loading

editing

error
```

Playback:

```
paused

playing

seeking
```

Export:

```
idle

preparing

encoding

completed

failed
```

---

## Editor Store

Stores:

- project document
- selected clips
- playhead position
- zoom level
- active tool

Powered by:

- Zustand
- Immer

---

## Async State

Managed by TanStack Query.

Used for:

- asset loading
- project loading
- metadata fetching

Not used for timeline state.

---

# Error Handling

Spectux uses typed Result based errors.

No exception-driven domain logic.

Example:

```ts
Result<Project, EditorError>
```

Errors:

```ts
{
   type: "TIMELINE.CLIP_NOT_FOUND"
}

{
   type: "FFMPEG.EXPORT_FAILED"
}
```

---

# Interface

Professional editor-inspired layout:

```
+---------------------------+-------------+
|                           |             |
|        Preview            | Media Bin   |
|                           |             |
+---------------------------+-------------+
|                                         |
|              Toolbar                    |
+-----------------------------------------+
|                                         |
|              Timeline                   |
|                                         |
+-----------------------------------------+
```

v0.1 UI:

- [x] Dark editor interface
- [ ] Resizable panels
- [x] Media browser
- [x] Preview monitor
- [x] Timeline
- [x] Transport controls

---

# Tech Stack

Frontend:

- TanStack Start
- React
- TypeScript
- Tailwind

State:

- XState
- Zustand
- TanStack Query

Editor:

- FFmpeg WASM
- Web Workers
- Comlink

Storage:

- IndexedDB
- Dexie

Quality:

- Vitest
- Zod
- neverthrow

---

# v0.1 Checklist

Core:

- [x] Create project

- [x] Import MP4

- [x] Store video locally

- [x] Add clip to timeline

- [ ] Preview playback

- [x] Seek timeline

- [x] Move clip

- [x] Trim clip

- [x] Split clip

- [x] Delete clip

- [x] Undo / Redo

- [x] Save project

- [x] Reload project

- [x] Export MP4

---

# Philosophy

Spectux is built like an editor engine first,
and a web application second.

The browser is the runtime.

The timeline is the source of truth.

```

```
