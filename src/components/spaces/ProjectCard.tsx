import { useState } from 'react'
import type { Project } from '../../types/spatial'
import { formatFeetInchesPair } from '../../utils/units'
import { formatRelativeTime } from '../../utils/time'
import { FloorplanPreview } from './FloorplanPreview'

export function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: Project
  onOpen: () => void
  onDelete: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const layout = project.layouts[0]
  const room = layout?.room
  const layoutCount = project.layouts.length

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-white/70 shadow-[0_8px_24px_rgba(44,42,38,0.04)] transition duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_16px_32px_rgba(44,42,38,0.07)]">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative h-48 bg-paper-deep">
          {layout ? <FloorplanPreview layout={layout} /> : null}
        </div>
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h3 className="text-[16px] font-medium tracking-tight text-ink">{project.name}</h3>
            <p className="mt-1 text-[13px] text-ink-soft">
              {room ? formatFeetInchesPair(room.width, room.depth) : 'No room'}
              <span className="mx-2 text-line-strong">·</span>
              {layoutCount} {layoutCount === 1 ? 'layout' : 'layouts'}
            </p>
          </div>
          <p className="pt-1 text-[12px] text-muted">{formatRelativeTime(project.updatedAt)}</p>
        </div>
      </button>

      <div className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100">
        {confirm ? (
          <div className="anim-pop flex items-center gap-1 rounded-lg border border-line bg-white/95 p-1 shadow-sm">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-[11px] text-ink-soft hover:bg-paper-deep"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-[11px] text-red-800 hover:bg-red-50"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Delete space"
            className="rounded-md border border-line bg-white/90 px-2 py-1 text-[11px] text-ink-soft hover:text-ink"
            onClick={(event) => {
              event.stopPropagation()
              setConfirm(true)
            }}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  )
}
