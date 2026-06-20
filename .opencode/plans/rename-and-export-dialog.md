# Inline Project Rename

Make the project name in the TopBar editable by clicking on it.

---

## Changes

| File | Action |
|------|--------|
| `src/features/editor/store/project.store.ts` | Edit — add `setProjectName` action |
| `src/features/editor/components/EditorShell/TopBar.tsx` | Edit — inline-editable project name |

---

## Step 1: Add `setProjectName` to store

In `project.store.ts`, add to the `ProjectStore` interface:

```ts
setProjectName: (name: string) => void
```

Implementation (add after `markClean`):

```ts
setProjectName(name) {
  set((state) => {
    state.project.name = name
    state.project.updatedAt = Date.now()
    state.isDirty = true
  })
},
```

---

## Step 2: Inline-editable project name in TopBar

Add state and handlers inside `TopBar`:

```tsx
const [editingName, setEditingName] = useState(false)
const [nameDraft, setNameDraft] = useState(project.name)
const setProjectName = useProjectStore((s) => s.setProjectName)
const inputRef = useRef<HTMLInputElement>(null)

function startEditing() {
  setNameDraft(project.name)
  setEditingName(true)
}

function commitName() {
  const trimmed = nameDraft.trim()
  if (trimmed && trimmed !== project.name) {
    setProjectName(trimmed)
  }
  setEditingName(false)
}

function cancelEditing() {
  setEditingName(false)
}
```

Replace the static name `<span>` with a conditional toggle:

```tsx
<div className="flex items-center gap-1">
  {editingName ? (
    <input
      ref={inputRef}
      value={nameDraft}
      onChange={(e) => setNameDraft(e.target.value)}
      onBlur={commitName}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitName()
        if (e.key === 'Escape') cancelEditing()
      }}
      className="h-5 rounded bg-neutral-800 px-1 text-sm text-neutral-200 outline-none ring-1 ring-blue-500"
      autoFocus
    />
  ) : (
    <span
      onClick={startEditing}
      className="cursor-pointer rounded px-1 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300"
      title="Click to rename"
    >
      {project.name}
    </span>
  )}
  {isDirty && <span className="text-neutral-500">•</span>}
</div>
```

---

## Behavior

- **Click name** → switches to input, auto-focuses, pre-filled with current name
- **Enter or blur** → saves trimmed name if non-empty and changed; reverts to span
- **Escape** → cancels, reverts to span with original name
- Saving updates `project.name`, `updatedAt`, and sets `isDirty = true`
