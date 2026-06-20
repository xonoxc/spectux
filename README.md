# Spectux 

**Spectux** is a browser-native non-linear video editor built around a modern client-side architecture.

The goal of Spectux is to bring desktop-style video editing workflows into the browser using WebAssembly, Web Workers, and a dedicated timeline engine.

It is not a video converter.

Spectux treats editing as a project document:
- edits are non-destructive
- timeline operations are deterministic
- rendering happens only during export


---

## ✨ Vision

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

# 🚀 Version 0.1 Goal

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

# 🧩 Features Roadmap


## Project System

- [ ] Create new project
- [ ] Store project metadata
- [ ] Save project locally
- [ ] Reload existing projects
- [ ] Serialize timeline document


Storage:

- IndexedDB
- Project JSON
- Asset blobs


---


## Media System

- [ ] Import MP4 files
- [ ] Drag/drop upload support
- [ ] Store media assets locally
- [ ] Generate asset metadata

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
- [ ] Seek timeline
- [ ] Display current timestamp
- [ ] Sync playhead


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

- [ ] Single video track
- [ ] Timeline ruler
- [ ] Playhead
- [ ] Clip selection


Editing:

- [ ] Move clips
- [ ] Trim clip start/end
- [ ] Split clip at playhead
- [ ] Delete clips


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

- [ ] MoveClipCommand

- [ ] TrimClipCommand

- [ ] SplitClipCommand

- [ ] DeleteClipCommand


History:

- [ ] Undo support
- [ ] Redo support


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

- [ ] Load FFmpeg WASM
- [ ] Generate render commands
- [ ] Export edited timeline
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
 type:"TIMELINE.CLIP_NOT_FOUND"
}

{
 type:"FFMPEG.EXPORT_FAILED"
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

- [ ] Dark editor interface
- [ ] Resizable panels
- [ ] Media browser
- [ ] Preview monitor
- [ ] Timeline
- [ ] Transport controls


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

- [ ] Create project

- [ ] Import MP4

- [ ] Store video locally

- [ ] Add clip to timeline

- [ ] Preview playback

- [ ] Seek timeline

- [ ] Move clip

- [ ] Trim clip

- [ ] Split clip

- [ ] Delete clip

- [ ] Undo / Redo

- [ ] Save project

- [ ] Reload project

- [ ] Export MP4


---


# Philosophy


Spectux is built like an editor engine first,
and a web application second.

The browser is the runtime.

The timeline is the source of truth.

```
