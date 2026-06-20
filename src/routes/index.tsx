import { createFileRoute } from '@tanstack/react-router'
import { EditorShell } from '../features/editor/components/EditorShell/EditorShell'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return <EditorShell />
}
