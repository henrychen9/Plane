import { useState } from 'react'
import { useEditorStore } from '../../state/editorStore'
import { useProjectStore } from '../../state/projectStore'
import { NewSpaceModal } from './NewSpaceModal'
import { ProjectCard } from './ProjectCard'

export function SpacesScreen() {
  const projects = useProjectStore((state) => state.projects)
  const createProject = useProjectStore((state) => state.createProject)
  const deleteProject = useProjectStore((state) => state.deleteProject)
  const openProject = useEditorStore((state) => state.openProject)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="h-full overflow-auto scroll-thin bg-paper">
      <div className="mx-auto max-w-6xl px-8 pb-20 pt-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-serif text-[34px] leading-none tracking-tight text-ink">Plane</p>
            <h1 className="mt-6 text-[13px] font-medium uppercase tracking-[0.18em] text-muted">
              Spaces
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="h-9 rounded-lg border border-line bg-white/80 px-3 text-[13px] text-ink transition hover:border-ink/20"
          >
            New Space
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-white/30 text-ink-soft transition hover:border-ink/25 hover:bg-white/60 hover:text-ink"
          >
            <span className="text-[22px] leading-none">+</span>
            <span className="mt-3 text-[13px]">New Space</span>
          </button>

          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => openProject(project.id)}
              onDelete={() => deleteProject(project.id)}
            />
          ))}
        </div>
      </div>

      <NewSpaceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={(name, width, depth) => {
          const project = createProject(name, width, depth)
          setModalOpen(false)
          openProject(project.id)
        }}
      />
    </div>
  )
}
