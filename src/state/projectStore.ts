import { persist } from 'zustand/middleware'
import { create } from 'zustand'
import {
  clearedPlan,
  copyArchitecture,
  finalizePlan,
  isAxisAlignedRectangle,
  layoutBounds,
  migrateFurnitureItem,
  migrateLayout,
  rectToPlan,
  resizeRectPlan,
} from '../architecture/plan'
import { refreshPlanGeometry } from '../architecture/vertices'
import { createChicagoStudio, emptyLayout, furnitureFromCatalog, nextLayoutName } from '../data/sample'
import { DUPLICATE_OFFSET, STORAGE_KEY } from '../editor/constants'
import type { Fixture, FloorPlan, FurnitureItem, Layout, Project, Room } from '../types/spatial'
import { clone } from '../utils/geometry'
import { createId } from '../utils/id'

export type SaveStatus = 'saved' | 'saving'

type ProjectState = {
  projects: Project[]
  seeded: boolean
  saveStatus: SaveStatus
  createProject: (name: string, width: number, depth: number) => Project
  deleteProject: (id: string) => void
  renameProject: (id: string, name: string) => void
  addLayout: (projectId: string, kind: 'empty' | 'duplicate', fromLayoutId: string) => Layout | null
  renameLayout: (projectId: string, layoutId: string, name: string) => void
  deleteLayout: (projectId: string, layoutId: string) => void
  replaceLayout: (projectId: string, layoutId: string, next: Pick<Layout, 'room' | 'furniture' | 'plan'>) => void
  updateRoom: (projectId: string, layoutId: string, patch: Partial<Room>) => void
  updatePlan: (
    projectId: string,
    layoutId: string,
    updater: (plan: FloorPlan) => FloorPlan,
    options?: { rebuild?: boolean },
  ) => void
  patchLayout: (
    projectId: string,
    layoutId: string,
    updater: (layout: Layout) => Layout,
    options?: { rebuild?: boolean },
  ) => void
  clearLayout: (projectId: string, layoutId: string) => void
  addFurniture: (projectId: string, layoutId: string, item: FurnitureItem) => void
  updateFurniture: (projectId: string, layoutId: string, id: string, patch: Partial<FurnitureItem>) => void
  removeFurniture: (projectId: string, layoutId: string, id: string) => void
  duplicateFurniture: (projectId: string, layoutId: string, id: string) => FurnitureItem | null
  placeCatalogItem: (
    projectId: string,
    layoutId: string,
    type: string,
    x: number,
    y: number,
  ) => FurnitureItem | null
  addFixture: (projectId: string, layoutId: string, fixture: Fixture) => void
  updateFixture: (projectId: string, layoutId: string, id: string, patch: Partial<Fixture>) => void
  removeFixture: (projectId: string, layoutId: string, id: string) => void
}

let saveTimer: ReturnType<typeof setTimeout> | undefined

function nowIso() {
  return new Date().toISOString()
}

function withUpdated(project: Project): Project {
  return { ...project, updatedAt: nowIso() }
}

function mapProject(projects: Project[], id: string, fn: (project: Project) => Project): Project[] {
  return projects.map((project) => (project.id === id ? withUpdated(fn(project)) : project))
}

function mapLayout(
  project: Project,
  layoutId: string,
  fn: (layout: Layout) => Layout,
): Project {
  return {
    ...project,
    layouts: project.layouts.map((layout) => (layout.id === layoutId ? fn(layout) : layout)),
  }
}

function withPlan(layout: Layout, plan: FloorPlan, rebuild = true): Layout {
  const next = rebuild ? finalizePlan(plan) : refreshPlanGeometry(plan)
  return {
    ...layout,
    plan: next,
    room: rebuild
      ? { ...layoutBounds({ ...layout, plan: next }), wallHeight: layout.room.wallHeight }
      : layout.room,
  }
}

function normalizeProjects(projects: Project[]): Project[] {
  return projects.map((project) => ({
    ...project,
    layouts: project.layouts.map((layout) => migrateLayout(layout)),
  }))
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      seeded: false,
      saveStatus: 'saved',

      createProject: (name, width, depth) => {
        const project: Project = {
          id: createId('prj'),
          name: name.trim() || 'Untitled Space',
          createdAt: nowIso(),
          updatedAt: nowIso(),
          layouts: [emptyLayout('Layout A', width, depth)],
        }
        set((state) => ({ projects: [project, ...state.projects] }))
        scheduleSaved()
        return project
      },

      deleteProject: (id) => {
        set((state) => ({ projects: state.projects.filter((project) => project.id !== id) }))
        scheduleSaved()
      },

      renameProject: (id, name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((state) => ({
          projects: mapProject(state.projects, id, (project) => ({ ...project, name: trimmed })),
        }))
        scheduleSaved()
      },

      addLayout: (projectId, kind, fromLayoutId) => {
        const project = get().projects.find((item) => item.id === projectId)
        if (!project) return null
        const source = migrateLayout(project.layouts.find((layout) => layout.id === fromLayoutId) ?? project.layouts[0])
        if (!source) return null
        const name = nextLayoutName(project.layouts.map((layout) => layout.name))
        const layout: Layout =
          kind === 'duplicate'
            ? {
                id: createId('lay'),
                name,
                room: clone(source.room),
                furniture: source.furniture.map((item) => ({ ...clone(item), id: createId('fur') })),
                plan: clone(source.plan),
              }
            : {
                id: createId('lay'),
                name,
                room: clone(source.room),
                furniture: [],
                plan: copyArchitecture(source.plan),
              }
        set((state) => ({
          projects: mapProject(state.projects, projectId, (current) => ({
            ...current,
            layouts: [...current.layouts, layout],
          })),
        }))
        scheduleSaved()
        return layout
      },

      renameLayout: (projectId, layoutId, name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) =>
            mapLayout(project, layoutId, (layout) => ({ ...layout, name: trimmed })),
          ),
        }))
        scheduleSaved()
      },

      deleteLayout: (projectId, layoutId) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) => {
            if (project.layouts.length <= 1) return project
            return { ...project, layouts: project.layouts.filter((layout) => layout.id !== layoutId) }
          }),
        }))
        scheduleSaved()
      },

      replaceLayout: (projectId, layoutId, next) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) =>
            mapLayout(project, layoutId, (layout) =>
              withPlan(
                { ...layout, room: clone(next.room), furniture: clone(next.furniture) },
                clone(next.plan),
              ),
            ),
          ),
        }))
        scheduleSaved()
      },

      updateRoom: (projectId, layoutId, patch) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) =>
            mapLayout(project, layoutId, (layout) => {
              const current = migrateLayout(layout)
              const room = { ...current.room, ...patch }
              if (
                (patch.width !== undefined || patch.depth !== undefined) &&
                isAxisAlignedRectangle(current.plan)
              ) {
                return withPlan({ ...current, room }, resizeRectPlan(current.plan, room.width, room.depth))
              }
              return { ...current, room }
            }),
          ),
        }))
        scheduleSaved()
      },

      updatePlan: (projectId, layoutId, updater, options) => {
        const rebuild = options?.rebuild !== false
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) =>
            mapLayout(project, layoutId, (layout) => {
              const current = migrateLayout(layout)
              return withPlan(
                current,
                updater(current.plan ?? rectToPlan(current.room.width, current.room.depth)),
                rebuild,
              )
            }),
          ),
        }))
        scheduleSaved()
      },

      patchLayout: (projectId, layoutId, updater, options) => {
        const rebuild = options?.rebuild !== false
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) =>
            mapLayout(project, layoutId, (layout) => {
              const current = migrateLayout(layout)
              const next = updater(current)
              return withPlan({ ...next, furniture: next.furniture }, next.plan, rebuild)
            }),
          ),
        }))
        scheduleSaved()
      },

      clearLayout: (projectId, layoutId) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) =>
            mapLayout(project, layoutId, (layout) => {
              const current = migrateLayout(layout)
              return {
                ...current,
                furniture: [],
                plan: finalizePlan(clearedPlan(current.plan)),
                room: current.room,
              }
            }),
          ),
        }))
        scheduleSaved()
      },

      addFurniture: (projectId, layoutId, item) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) =>
            mapLayout(project, layoutId, (layout) => ({
              ...migrateLayout(layout),
              furniture: [...layout.furniture, item],
            })),
          ),
        }))
        scheduleSaved()
      },

      updateFurniture: (projectId, layoutId, id, patch) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) =>
            mapLayout(project, layoutId, (layout) => ({
              ...layout,
              furniture: layout.furniture.map((item) =>
                item.id === id ? migrateFurnitureItem({ ...item, ...patch }) : item,
              ),
            })),
          ),
        }))
        scheduleSaved()
      },

      removeFurniture: (projectId, layoutId, id) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) =>
            mapLayout(project, layoutId, (layout) => ({
              ...layout,
              furniture: layout.furniture.filter((item) => item.id !== id),
            })),
          ),
        }))
        scheduleSaved()
      },

      duplicateFurniture: (projectId, layoutId, id) => {
        const project = get().projects.find((item) => item.id === projectId)
        const layout = project?.layouts.find((item) => item.id === layoutId)
        const source = layout?.furniture.find((item) => item.id === id)
        if (!source) return null
        const copy: FurnitureItem = {
          ...clone(source),
          id: createId('fur'),
          x: source.x + DUPLICATE_OFFSET,
          y: source.y + DUPLICATE_OFFSET,
          locked: false,
        }
        get().addFurniture(projectId, layoutId, copy)
        return copy
      },

      placeCatalogItem: (projectId, layoutId, type, x, y) => {
        const item = furnitureFromCatalog(type, x, y)
        if (!item) return null
        get().addFurniture(projectId, layoutId, item)
        return item
      },

      addFixture: (projectId, layoutId, fixture) => {
        get().updatePlan(projectId, layoutId, (plan) => ({ ...plan, fixtures: [...plan.fixtures, fixture] }))
      },

      updateFixture: (projectId, layoutId, id, patch) => {
        get().updatePlan(projectId, layoutId, (plan) => ({
          ...plan,
          fixtures: plan.fixtures.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }))
      },

      removeFixture: (projectId, layoutId, id) => {
        get().updatePlan(projectId, layoutId, (plan) => ({
          ...plan,
          fixtures: plan.fixtures.filter((item) => item.id !== id),
        }))
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        projects: state.projects,
        seeded: state.seeded,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (!state.seeded) {
          state.projects = [createChicagoStudio()]
          state.seeded = true
        } else {
          state.projects = normalizeProjects(state.projects)
        }
      },
    },
  ),
)

function scheduleSaved() {
  useProjectStore.setState({ saveStatus: 'saving' })
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    useProjectStore.setState({ saveStatus: 'saved' })
  }, 420)
}

export function getProject(id: string | null): Project | undefined {
  if (!id) return undefined
  return useProjectStore.getState().projects.find((project) => project.id === id)
}

export function getLayout(projectId: string | null, layoutId: string | null): Layout | undefined {
  if (!projectId || !layoutId) return undefined
  const layout = getProject(projectId)?.layouts.find((item) => item.id === layoutId)
  return layout ? migrateLayout(layout) : undefined
}
