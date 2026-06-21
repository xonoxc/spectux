import { describe, it, expect } from "vitest"
import { createCommandManager } from "../commands/CommandManager"
import { createProject } from "../project/Project"
import { createSplitClipCommand } from "../commands/SplitClipCommand"
import { createDeleteClipCommand } from "../commands/DeleteClipCommand"
import { createMoveClipCommand } from "../commands/MoveClipCommand"
import { createTrimClipCommand } from "../commands/TrimClipCommand"
import { addTrack } from "../timeline/Timeline"
import { addClip } from "../timeline/Track"
import { createClip } from "../timeline/Clip"

function makeProjectWithClip() {
   let project = createProject({ id: "test", name: "Test" })
   const withTrack = addTrack(project.timeline, "video", "track-1")
   if (withTrack.isErr()) throw new Error("Failed to create track")
   project = { ...project, timeline: withTrack.value }

   const clip = createClip({
      id: "clip-1",
      assetId: "asset-1",
      start: 0,
      end: 10,
      timelineStart: 0,
   })

   const withClip = addClip(project.timeline.tracks[0], clip)
   if (withClip.isErr()) throw new Error("Failed to add clip")
   project = {
      ...project,
      timeline: {
         ...project.timeline,
         tracks: project.timeline.tracks.map(t => (t.id === "track-1" ? withClip.value : t)),
      },
   }

   return project
}

describe("CommandManager", () => {
   it("executes a command and modifies the project", () => {
      const cmd = createCommandManager()
      const project = makeProjectWithClip()

      const command = createSplitClipCommand({
         clipId: "clip-1",
         splitTime: 5,
      })

      const result = cmd.execute(command, project)
      expect(result.isOk()).toBe(true)
      if (result.isErr()) return

      expect(result.value.project.timeline.tracks[0].clips.length).toBe(2)
   })

   it("undo restores the previous state", () => {
      const cmd = createCommandManager()
      const project = makeProjectWithClip()

      const command = createSplitClipCommand({
         clipId: "clip-1",
         splitTime: 5,
      })

      const execResult = cmd.execute(command, project)
      expect(execResult.isOk()).toBe(true)
      if (execResult.isErr()) return

      const afterExec = execResult.value.project
      expect(afterExec.timeline.tracks[0].clips.length).toBe(2)

      const undoResult = cmd.undo(afterExec)
      expect(undoResult.isOk()).toBe(true)
      if (undoResult.isErr() || !undoResult.value) return

      expect(undoResult.value.project.timeline.tracks[0].clips.length).toBe(1)
      expect(undoResult.value.project.timeline.tracks[0].clips[0].id).toBe("clip-1")
   })

   it("redo re-applies the command after undo", () => {
      const cmd = createCommandManager()
      const project = makeProjectWithClip()

      const command = createSplitClipCommand({
         clipId: "clip-1",
         splitTime: 5,
      })

      const execResult = cmd.execute(command, project)
      expect(execResult.isOk()).toBe(true)
      if (execResult.isErr()) return
      const afterExec = execResult.value.project
      expect(afterExec.timeline.tracks[0].clips.length).toBe(2)

      const undoResult = cmd.undo(afterExec)
      expect(undoResult.isOk()).toBe(true)
      if (undoResult.isErr() || !undoResult.value) return
      const undoneProject = undoResult.value.project
      expect(undoneProject.timeline.tracks[0].clips.length).toBe(1)

      const redoResult = cmd.redo(undoneProject)
      expect(redoResult.isOk()).toBe(true)
      if (redoResult.isErr() || !redoResult.value) return

      expect(redoResult.value.project.timeline.tracks[0].clips.length).toBe(2)
   })

   it("redo stack is cleared after a new command", () => {
      const cmd = createCommandManager()
      const project = makeProjectWithClip()

      const splitCmd = createSplitClipCommand({
         clipId: "clip-1",
         splitTime: 5,
      })

      const execResult = cmd.execute(splitCmd, project)
      if (execResult.isErr()) return
      const afterExec = execResult.value.project

      cmd.undo(afterExec)

      const moveCmd = createMoveClipCommand({
         clipId: "clip-1",
         newTimelineStart: 5,
      })

      cmd.execute(moveCmd, project)

      expect(cmd.canRedo()).toBe(false)
   })

   it("supports multiple undo/redo cycles", () => {
      const cmd = createCommandManager()
      let project = makeProjectWithClip()
      const initialClips = project.timeline.tracks[0].clips.length

      const splitCmd = createSplitClipCommand({
         clipId: "clip-1",
         splitTime: 5,
      })

      const execResult = cmd.execute(splitCmd, project)
      if (execResult.isErr()) return
      project = execResult.value.project

      const deleteRightCmd = createDeleteClipCommand({
         clipId: "clip-1-split",
      })

      const delResult = cmd.execute(deleteRightCmd, project)
      if (delResult.isErr()) return
      project = delResult.value.project

      expect(project.timeline.tracks[0].clips.length).toBe(1)
      expect(project.timeline.tracks[0].clips[0].id).toBe("clip-1")

      const undo1 = cmd.undo(project)
      if (undo1.isErr() || !undo1.value) return
      project = undo1.value.project
      expect(project.timeline.tracks[0].clips.length).toBe(2)

      const undo2 = cmd.undo(project)
      if (undo2.isErr() || !undo2.value) return
      project = undo2.value.project
      expect(project.timeline.tracks[0].clips.length).toBe(initialClips)
   })

   it("reports canUndo / canRedo correctly", () => {
      const cmd = createCommandManager()
      expect(cmd.canUndo()).toBe(false)
      expect(cmd.canRedo()).toBe(false)

      const project = makeProjectWithClip()
      const command = createMoveClipCommand({
         clipId: "clip-1",
         newTimelineStart: 5,
      })

      cmd.execute(command, project)
      expect(cmd.canUndo()).toBe(true)
      expect(cmd.canRedo()).toBe(false)

      cmd.undo(project)
      expect(cmd.canUndo()).toBe(false)
      expect(cmd.canRedo()).toBe(true)
   })

   it("execute on a failed command does not push to undo stack", () => {
      const cmd = createCommandManager()
      const project = makeProjectWithClip()

      const badCommand = createSplitClipCommand({
         clipId: "nonexistent",
         splitTime: 5,
      })

      const result = cmd.execute(badCommand, project)
      expect(result.isErr()).toBe(true)

      expect(cmd.canUndo()).toBe(false)
   })
})

describe("SplitClipCommand", () => {
   it("produces correct event on execute", () => {
      const project = makeProjectWithClip()
      const command = createSplitClipCommand({
         clipId: "clip-1",
         splitTime: 5,
      })

      const snapshot = structuredClone(project)
      const execResult = command.execute(project)
      if (execResult.isErr()) return

      const event = command.emitEvent(snapshot, execResult.value)
      expect(event).not.toBeNull()
      if (event && "type" in event) {
         expect(event.type).toBe("CLIP_SPLIT")
      }
   })
})

describe("TrimClipCommand", () => {
   it("undo restores original trim values", () => {
      const cmd = createCommandManager()
      const project = makeProjectWithClip()

      const command = createTrimClipCommand({
         clipId: "clip-1",
         newStart: 2,
         newEnd: 8,
      })

      const execResult = cmd.execute(command, project)
      expect(execResult.isOk()).toBe(true)
      if (execResult.isErr()) return

      const afterExec = execResult.value.project
      const clip = afterExec.timeline.tracks[0].clips[0]
      expect(clip.start).toBe(2)
      expect(clip.end).toBe(8)

      const undoResult = cmd.undo(afterExec)
      expect(undoResult.isOk()).toBe(true)
      if (undoResult.isErr() || !undoResult.value) return

      const originalClip = undoResult.value.project.timeline.tracks[0].clips[0]
      expect(originalClip.start).toBe(0)
      expect(originalClip.end).toBe(10)
   })
})
