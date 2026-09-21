import { useState } from 'react'
import { useEditorStore } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'
import { LayoutMenu } from './LayoutMenu'

export function TopBar() {
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  const openSpaces = useEditorStore((state) => state.openSpaces)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const past = useEditorStore((state) => state.past)
  const future = useEditorStore((state) => state.future)
  const saveStatus = useProjectStore((state) => state.saveStatus)
  const project = useProjectStore((state) =>
    state.projects.find((item) => item.id === projectId),
  )
  const renameProject = useProjectStore((state) => state.renameProject)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project?.name ?? '')
  const [confirmClear, setConfirmClear] = useState(false)

  if (!projectId || !layoutId || !project) return null

  return (
    <header className="panel pointer-events-auto absolute left-3 right-3 top-3 z-30 flex h-12 min-h-12 items-center rounded-xl px-3">
      <button
        type="button"
        onClick={openSpaces}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-ink-soft transition hover:bg-black/4 hover:text-ink"
      >
        <span className="text-[15px] leading-none">←</span>
        Spaces
      </button>

      <div className="ml-5 flex items-center gap-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              renameProject(projectId, draft)
              setEditing(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') setEditing(false)
            }}
            className="h-8 w-44 rounded-md border border-line bg-white px-2 text-[14px] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(project.name)
              setEditing(true)
            }}
            className="rounded-md px-1.5 py-0.5 text-[14px] font-medium text-ink hover:bg-black/4"
          >
            {project.name}
          </button>
        )}
        <span className="px-1 text-muted">/</span>
        <LayoutMenu projectId={projectId} layoutId={layoutId} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <IconButton label="Undo" disabled={past.length === 0} onClick={undo}>
          Undo
        </IconButton>
        <IconButton label="Redo" disabled={future.length === 0} onClick={redo}>
          Redo
        </IconButton>
        <span className="mx-1 h-4 w-px bg-line" />
        <IconButton label="Clear layout" onClick={() => setConfirmClear(true)}>
          Clear
        </IconButton>
        <span className="mx-2 h-4 w-px bg-line" />
        <span className="min-w-[64px] text-[12px] text-muted">
          {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
        </span>
        <DisplayModeSwitch />
      </div>
      {confirmClear && projectId && layoutId ? (
        <ClearLayoutDialog
          projectId={projectId}
          layoutId={layoutId}
          onClose={() => setConfirmClear(false)}
        />
      ) : null}
    </header>
  )
}

function DisplayModeSwitch() {
  const displayMode = useEditorStore((state) => state.displayMode)
  const setDisplayMode = useEditorStore((state) => state.setDisplayMode)

  return (
    <div className="flex rounded-md border border-line bg-white/60 p-0.5" role="group" aria-label="View mode">
      <button
        type="button"
        aria-pressed={displayMode === '2d'}
        onClick={() => setDisplayMode('2d')}
        className={`h-7 rounded px-2 text-[11px] font-medium tracking-[0.12em] transition ${
          displayMode === '2d' ? 'bg-white text-ink shadow-[0_1px_2px_rgba(44,42,38,0.08)]' : 'text-ink-soft hover:text-ink'
        }`}
      >
        2D
      </button>
      <button
        type="button"
        aria-pressed={displayMode === '3d'}
        onClick={() => setDisplayMode('3d')}
        className={`h-7 rounded px-2 text-[11px] font-medium tracking-[0.12em] transition ${
          displayMode === '3d' ? 'bg-white text-ink shadow-[0_1px_2px_rgba(44,42,38,0.08)]' : 'text-ink-soft hover:text-ink'
        }`}
      >
        3D
      </button>
    </div>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-8 rounded-md px-2 text-[13px] text-ink-soft transition hover:bg-black/4 hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function ClearLayoutDialog({
  projectId,
  layoutId,
  onClose,
}: {
  projectId: string
  layoutId: string
  onClose: () => void
}) {
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const setSelection = useEditorStore((state) => state.setSelection)
  const clearLayout = useProjectStore((state) => state.clearLayout)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10" data-plane-panel="true">
      <div className="panel w-[22rem] rounded-2xl p-5">
        <p className="font-serif text-[24px] text-ink">Clear this layout?</p>
        <p className="mt-2 text-[13px] leading-5 text-ink-soft">
          This will remove all walls, doors, windows, outlets, fixtures, furniture, and measurements from the current
          layout. This cannot be undone after leaving the editor.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="h-8 rounded-md px-3 text-[13px] text-muted" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="h-8 rounded-md bg-[#8f3d32] px-3 text-[13px] text-white"
            onClick={() => {
              captureHistory()
              clearLayout(projectId, layoutId)
              setSelection(null)
              onClose()
            }}
          >
            Clear Layout
          </button>
        </div>
      </div>
    </div>
  )
}
