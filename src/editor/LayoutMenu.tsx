import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'

export function LayoutMenu({
  projectId,
  layoutId,
}: {
  projectId: string
  layoutId: string
}) {
  const project = useProjectStore((state) => state.projects.find((item) => item.id === projectId))
  const open = useEditorStore((state) => state.layoutMenuOpen)
  const setOpen = useEditorStore((state) => state.setLayoutMenuOpen)
  const setLayoutId = useEditorStore((state) => state.setLayoutId)
  const addLayout = useProjectStore((state) => state.addLayout)
  const renameLayout = useProjectStore((state) => state.renameLayout)
  const deleteLayout = useProjectStore((state) => state.deleteLayout)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const layout = project?.layouts.find((item) => item.id === layoutId)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    return () => window.removeEventListener('pointerdown', onPointer)
  }, [open, setOpen])

  if (!project || !layout) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-md px-1.5 py-0.5 text-[14px] text-ink-soft transition hover:bg-black/4 hover:text-ink"
      >
        {layout.name}
      </button>
      {open ? (
        <div className="anim-pop absolute left-0 top-[calc(100%+8px)] z-30 w-56 overflow-hidden rounded-xl border border-line bg-[#fffdf9] py-1 shadow-[0_12px_32px_rgba(44,42,38,0.1)]">
          {project.layouts.map((item) => (
            <div key={item.id} className="flex items-center px-1">
              {editingId === item.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => {
                    renameLayout(projectId, item.id, draft)
                    setEditingId(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                    if (event.key === 'Escape') setEditingId(null)
                  }}
                  className="m-1 h-8 w-full rounded-md border border-line px-2 text-[13px] outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setLayoutId(item.id)
                    setOpen(false)
                  }}
                  className={`flex h-8 flex-1 items-center rounded-md px-2 text-left text-[13px] ${
                    item.id === layoutId ? 'bg-paper-deep text-ink' : 'text-ink-soft hover:bg-paper-deep/70 hover:text-ink'
                  }`}
                >
                  {item.name}
                </button>
              )}
            </div>
          ))}
          <div className="my-1 h-px bg-line" />
          <MenuButton
            label="Duplicate current layout"
            onClick={() => {
              const created = addLayout(projectId, 'duplicate', layoutId)
              if (created) setLayoutId(created.id)
              setOpen(false)
            }}
          />
          <MenuButton
            label="New empty layout"
            onClick={() => {
              const created = addLayout(projectId, 'empty', layoutId)
              if (created) setLayoutId(created.id)
              setOpen(false)
            }}
          />
          <MenuButton
            label="Rename layout"
            onClick={() => {
              setEditingId(layoutId)
              setDraft(layout.name)
            }}
          />
          {project.layouts.length > 1 ? (
            <MenuButton
              label="Delete layout"
              onClick={() => {
                const fallback = project.layouts.find((item) => item.id !== layoutId)
                deleteLayout(projectId, layoutId)
                if (fallback) setLayoutId(fallback.id)
                setOpen(false)
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-full items-center px-3 text-left text-[13px] text-ink-soft hover:bg-paper-deep/70 hover:text-ink"
    >
      {label}
    </button>
  )
}
