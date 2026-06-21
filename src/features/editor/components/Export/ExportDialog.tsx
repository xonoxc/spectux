import { useEffect, useRef, useState, useCallback } from "react"
import { useSelector } from "@xstate/react"
import { Loader2, X, Download, AlertCircle, CheckCircle2 } from "lucide-react"
import { createFFmpegRenderer } from "../../renderer/FFmpegRenderer"
import { useProjectStore } from "../../store/project.store"

import type { ActorRef } from "xstate"

interface ExportDialogProps {
   actor: ActorRef<any, any>
}

export function ExportDialog({ actor }: ExportDialogProps) {
   const state = useSelector(
      actor,
      s =>
         s as {
            value: string
            context: {
               progress: number
               error: string | null
               outputBlob: Blob | null
            }
         }
   )
   const send = actor.send
   const project = useProjectStore(s => s.project)
   const setExporting = useProjectStore(s => s.setExporting)
   const rendererRef = useRef<ReturnType<typeof createFFmpegRenderer> | null>(null)
   const [elapsed, setElapsed] = useState(0)
   const startTimeRef = useRef(0)
   const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

   const stateValue = typeof state.value === "string" ? state.value : "encoding"

   useEffect(() => {
      if (stateValue === "idle" || stateValue === "completed" || stateValue === "failed") {
         setExporting(false)
      }
   }, [stateValue, setExporting])

   useEffect(() => {
      if (stateValue !== "encoding") return

      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
         setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)

      let cancelled = false
      const renderer = createFFmpegRenderer()
      rendererRef.current = renderer

      renderer.onProgress(progress => {
         if (!cancelled) send({ type: "PROGRESS", progress })
      })

      renderer.export(project).then(result => {
         if (cancelled) return
         if (result.isOk()) {
            send({ type: "COMPLETE", blob: result.value })
         } else {
            const reason =
               result.error.type === "FFMPEG.EXPORT_FAILED" ? result.error.reason : "Export failed"
            send({ type: "FAILED", error: reason })
         }
      })

      return () => {
         cancelled = true
         renderer.cancel()
         if (timerRef.current) clearInterval(timerRef.current)
      }
   }, [stateValue, project, send])

   const handleCancel = useCallback(() => {
      rendererRef.current?.cancel()
      rendererRef.current = null
      send({ type: "CANCEL" })
   }, [send])

   const handleReset = useCallback(() => {
      send({ type: "RESET" })
   }, [send])

   const handleRetry = useCallback(() => {
      send({ type: "START_EXPORT" })
   }, [send])

   const handleDownload = useCallback(() => {
      const blob = state.context.outputBlob
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${project.name.replace(/[^a-zA-Z0-9-_]/g, "_")}.mp4`
      a.click()
      URL.revokeObjectURL(url)
   }, [state.context.outputBlob, project.name])

   if (stateValue === "idle") return null

   const formatTime = (s: number) => {
      const m = Math.floor(s / 60)
      const sec = s % 60
      return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
   }

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
         <div className="w-96 rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
               <h2 className="text-sm font-medium text-neutral-200">
                  {stateValue === "preparing" && "Preparing Export"}
                  {stateValue === "encoding" && "Exporting Video"}
                  {stateValue === "completed" && "Export Complete"}
                  {stateValue === "failed" && "Export Failed"}
               </h2>
               {(stateValue === "completed" || stateValue === "failed") && (
                  <button
                     onClick={handleReset}
                     className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                  >
                     <X size={14} />
                  </button>
               )}
            </div>

            {stateValue === "preparing" && (
               <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 size={24} className="animate-spin text-blue-400" />
                  <p className="text-sm text-neutral-400">Preparing timeline...</p>
               </div>
            )}

            {stateValue === "encoding" && (
               <div className="flex flex-col gap-3 py-4">
                  <div className="flex items-center gap-2">
                     <Loader2 size={16} className="animate-spin text-blue-400" />
                     <span className="text-sm text-neutral-300">Rendering video...</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                     <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-300"
                        style={{
                           width: `${Math.round(state.context.progress * 100)}%`,
                        }}
                     />
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                     <span>{Math.round(state.context.progress * 100)}%</span>
                     <span>Elapsed: {formatTime(elapsed)}</span>
                  </div>
                  <button
                     onClick={handleCancel}
                     className="mt-2 self-center rounded bg-neutral-800 px-4 py-1.5 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                  >
                     Cancel
                  </button>
               </div>
            )}

            {stateValue === "completed" && (
               <div className="flex flex-col items-center gap-4 py-6">
                  <CheckCircle2 size={32} className="text-green-400" />
                  <p className="text-sm text-neutral-300">Export complete</p>
                  <div className="flex gap-2">
                     <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-500"
                     >
                        <Download size={12} />
                        Download
                     </button>
                     <button
                        onClick={handleReset}
                        className="rounded bg-neutral-800 px-4 py-1.5 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                     >
                        Close
                     </button>
                  </div>
               </div>
            )}

            {stateValue === "failed" && (
               <div className="flex flex-col items-center gap-4 py-6">
                  <AlertCircle size={32} className="text-red-400" />
                  <p className="text-xs text-red-300">{state.context.error || "Export failed"}</p>
                  <div className="flex gap-2">
                     <button
                        onClick={handleRetry}
                        className="rounded bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-500"
                     >
                        Retry
                     </button>
                     <button
                        onClick={handleReset}
                        className="rounded bg-neutral-800 px-4 py-1.5 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                     >
                        Close
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
   )
}
