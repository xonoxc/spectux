import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { createCommandManager, createProject, addTrack } from "~"
import type { CommandManager, Project, Command, EditorError } from "~"
import { nanoid } from "nanoid"
import type { Result } from "neverthrow"

export type EditorTool = "select" | "cut" | "trim"

export interface ProjectStore {
   project: Project
   selectedClipIds: string[]
   inspectedAssetId: string | null
   currentTime: number
   zoom: number
   selectedTool: EditorTool
   snapping: boolean
   isDirty: boolean
   isExporting: boolean

   cmd: CommandManager

   executeCommand: (command: Command) => Result<{ project: Project }, EditorError>
   undo: () => void
   redo: () => void
   selectClip: (clipId: string | null) => void
   inspectAsset: (assetId: string | null) => void
   removeAsset: (assetId: string) => void
   closeInspector: () => void
   setCurrentTime: (time: number) => void
   setZoom: (zoom: number) => void
   setSelectedTool: (tool: EditorTool) => void
   setSnapping: (snapping: boolean) => void
   loadProject: (project: Project) => void
   markClean: () => void
   setProjectName: (name: string) => void
   setExporting: (exporting: boolean) => void
}

function createDefaultProject(): Project {
   const project = createProject({ id: nanoid(), name: "Untitled Project" })
   let timeline = project.timeline
   const v = addTrack(timeline, "video", "track-v1")
   if (v.isOk()) timeline = v.value
   const a = addTrack(timeline, "audio", "track-a1")
   if (a.isOk()) timeline = a.value
   return { ...project, timeline }
}

export const useProjectStore = create<ProjectStore>()(
   immer((set, get) => ({
      project: createDefaultProject(),
      selectedClipIds: [],
      inspectedAssetId: null,
      currentTime: 0,
      zoom: 50,
      selectedTool: "select",
      snapping: true,
      isDirty: false,
      isExporting: false,

      cmd: createCommandManager(),

      executeCommand(command) {
         const { project, cmd } = get()
         const result = cmd.execute(command, project)

         if (result.isOk()) {
            set(state => {
               state.project = result.value.project
               state.isDirty = true
            })
         }

         return result
      },

      undo() {
         const { project, cmd } = get()
         const result = cmd.undo(project)

         if (result.isOk() && result.value) {
            set(state => {
               state.project = result.value!.project
               state.isDirty = true
            })
         }
      },

      redo() {
         const { project, cmd } = get()
         const result = cmd.redo(project)

         if (result.isOk() && result.value) {
            set(state => {
               state.project = result.value!.project
               state.isDirty = true
            })
         }
      },

      selectClip(clipId) {
         set(state => {
            if (clipId === null) {
               state.selectedClipIds = []
            } else {
               state.selectedClipIds = [clipId]
            }
         })
      },

      inspectAsset(assetId) {
         set(state => {
            state.inspectedAssetId = assetId
         })
      },

      removeAsset(assetId) {
         set(state => {
            state.project.assets = state.project.assets.filter(asset => asset.id !== assetId)
            state.project.timeline.tracks = state.project.timeline.tracks.map(track => ({
               ...track,
               clips: track.clips.filter(clip => clip.assetId !== assetId),
            }))
            state.selectedClipIds = state.selectedClipIds.filter(clipId =>
               state.project.timeline.tracks.some(track =>
                  track.clips.some(clip => clip.id === clipId)
               )
            )
            if (state.inspectedAssetId === assetId) {
               state.inspectedAssetId = null
            }
            state.project.updatedAt = Date.now()
            state.isDirty = true
         })
      },

      closeInspector() {
         set(state => {
            state.selectedClipIds = []
            state.inspectedAssetId = null
         })
      },

      setCurrentTime(time) {
         set(state => {
            state.currentTime = time
         })
      },

      setZoom(zoom) {
         set(state => {
            state.zoom = Math.max(10, Math.min(200, zoom))
         })
      },

      setSelectedTool(tool) {
         set(state => {
            state.selectedTool = tool
         })
      },

      setSnapping(snapping) {
         set(state => {
            state.snapping = snapping
         })
      },

      loadProject(project) {
         set(state => {
            state.project = project
            state.cmd = createCommandManager()
            state.isDirty = false
         })
      },

      markClean() {
         set(state => {
            state.isDirty = false
         })
      },

      setProjectName(name) {
         set(state => {
            state.project.name = name
            state.project.updatedAt = Date.now()
            state.isDirty = true
         })
      },

      setExporting(exporting) {
         set(state => {
            state.isExporting = exporting
         })
      },
   }))
)
