import { create } from 'zustand'
import { HISTORY_LIMIT } from '../editor/constants'
import { loadClipboard, persistClipboard, type ClipboardPayload } from '../editor/clipboardModel'
import { sameSelection, uniqueSelections } from '../editor/selection'
import type {
  AlignmentGuide,
  BuildTool,
  EditorSelection,
  FurnitureItem,
  LayerId,
  Point,
  Room,
} from '../types/spatial'
import type { FloorPlan } from '../types/spatial'
import { clone } from '../utils/geometry'
import { getLayout, useProjectStore } from './projectStore'

export type AppView = 'spaces' | 'editor'
export type DisplayMode = '2d' | '3d'
export type LibraryTab = 'build' | 'furniture'
export type CameraMode = 'orbit' | 'top' | 'walk'

export const DEFAULT_LAYERS: Record<LayerId, boolean> = {
  architecture: true,
  furniture: true,
  electrical: true,
  measurements: true,
  grid: true,
}

type LayoutSnapshot = {
  projectId: string
  layoutId: string
  room: Room
  furniture: FurnitureItem[]
  plan: FloorPlan
}

export type ContextMenuState = {
  clientX: number
  clientY: number
  selection: EditorSelection
  world: Point
}

export type WallDeletePrompt = {
  wallId: string
  count: number
}

type EditorState = {
  view: AppView
  displayMode: DisplayMode
  cameraMode: CameraMode
  projectId: string | null
  layoutId: string | null
  selection: EditorSelection | null
  selections: EditorSelection[]
  marquee: { start: Point; current: Point } | null
  clipboard: ClipboardPayload | null
  pointerWorld: Point | null
  pointerOverCanvas: boolean
  tool: BuildTool
  wallDraft: Point[]
  wallPreview: Point | null
  measureDraft: Point | null
  measurePreview: Point | null
  measureTemp: { start: Point; end: Point } | null
  calibrateDraft: Point[]
  layers: Record<LayerId, boolean>
  zoom: number
  pan: { x: number; y: number }
  gridEnabled: boolean
  altHeld: boolean
  shiftHeld: boolean
  spaceHeld: boolean
  isPanning: boolean
  draggingId: string | null
  draggingOpeningId: string | null
  libraryTab: LibraryTab
  openCategories: string[]
  guides: AlignmentGuide[]
  layoutMenuOpen: boolean
  contextMenu: ContextMenuState | null
  pendingWallDelete: WallDeletePrompt | null
  hoverHint: string | null
  past: LayoutSnapshot[]
  future: LayoutSnapshot[]
  fitNonce: number
  threeFitNonce: number
  libraryDrag: { type: string; clientX: number; clientY: number } | null
  setDisplayMode: (mode: DisplayMode) => void
  setCameraMode: (mode: CameraMode) => void
  openSpaces: () => void
  openProject: (projectId: string, layoutId?: string) => void
  setLayoutId: (layoutId: string) => void
  setSelection: (selection: EditorSelection | null) => void
  setSelections: (selections: EditorSelection[]) => void
  selectOnly: (selection: EditorSelection) => void
  toggleSelection: (selection: EditorSelection) => void
  selectObject: (selection: EditorSelection, additive?: boolean) => void
  setMarquee: (marquee: EditorState['marquee']) => void
  setClipboard: (clipboard: ClipboardPayload | null) => void
  setPointerWorld: (point: Point | null) => void
  setPointerOverCanvas: (value: boolean) => void
  setTool: (tool: BuildTool) => void
  setWallDraft: (points: Point[]) => void
  setWallPreview: (point: Point | null) => void
  setMeasureDraft: (point: Point | null) => void
  setMeasurePreview: (point: Point | null) => void
  setMeasureTemp: (value: { start: Point; end: Point } | null) => void
  setCalibrateDraft: (points: Point[]) => void
  setLayer: (id: LayerId, visible: boolean) => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  setViewport: (zoom: number, pan: { x: number; y: number }) => void
  setGridEnabled: (enabled: boolean) => void
  setModifiers: (patch: Partial<Pick<EditorState, 'altHeld' | 'shiftHeld' | 'spaceHeld'>>) => void
  setPanning: (value: boolean) => void
  setDraggingId: (id: string | null) => void
  setDraggingOpeningId: (id: string | null) => void
  setLibraryTab: (tab: LibraryTab) => void
  toggleCategory: (category: string) => void
  setGuides: (guides: AlignmentGuide[]) => void
  setLayoutMenuOpen: (open: boolean) => void
  setContextMenu: (menu: ContextMenuState | null) => void
  setPendingWallDelete: (value: WallDeletePrompt | null) => void
  setHoverHint: (hint: string | null) => void
  cancelTool: () => void
  requestFit: () => void
  requestThreeFit: () => void
  setLibraryDrag: (drag: EditorState['libraryDrag']) => void
  captureHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

function currentSnapshot(): LayoutSnapshot | null {
  const { projectId, layoutId } = useEditorStore.getState()
  const layout = getLayout(projectId, layoutId)
  if (!projectId || !layoutId || !layout) return null
  return {
    projectId,
    layoutId,
    room: clone(layout.room),
    furniture: clone(layout.furniture),
    plan: clone(layout.plan),
  }
}

function snapshotsEqual(a: LayoutSnapshot, b: LayoutSnapshot): boolean {
  return (
    JSON.stringify(a.room) === JSON.stringify(b.room) &&
    JSON.stringify(a.furniture) === JSON.stringify(b.furniture) &&
    JSON.stringify(a.plan) === JSON.stringify(b.plan)
  )
}

const toolResets = {
  wallDraft: [] as Point[],
  wallPreview: null as Point | null,
  measureDraft: null as Point | null,
  measurePreview: null as Point | null,
  measureTemp: null as { start: Point; end: Point } | null,
  calibrateDraft: [] as Point[],
  hoverHint: null as string | null,
  marquee: null as { start: Point; current: Point } | null,
}

const selectionReset = {
  selection: null as EditorSelection | null,
  selections: [] as EditorSelection[],
  marquee: null as { start: Point; current: Point } | null,
}

export const useEditorStore = create<EditorState>((set, get) => ({
  view: 'spaces',
  displayMode: '2d',
  cameraMode: 'orbit',
  projectId: null,
  layoutId: null,
  selection: null,
  selections: [],
  marquee: null,
  clipboard: loadClipboard(),
  pointerWorld: null,
  pointerOverCanvas: false,
  tool: 'select',
  wallDraft: [],
  wallPreview: null,
  measureDraft: null,
  measurePreview: null,
  measureTemp: null,
  calibrateDraft: [],
  layers: { ...DEFAULT_LAYERS },
  zoom: 1,
  pan: { x: 0, y: 0 },
  gridEnabled: true,
  altHeld: false,
  shiftHeld: false,
  spaceHeld: false,
  isPanning: false,
  draggingId: null,
  draggingOpeningId: null,
  libraryTab: 'build',
  openCategories: ['beds'],
  guides: [],
  layoutMenuOpen: false,
  contextMenu: null,
  pendingWallDelete: null,
  hoverHint: null,
  past: [],
  future: [],
  fitNonce: 0,
  threeFitNonce: 0,
  libraryDrag: null,

  setDisplayMode: (mode) => set({ displayMode: mode, libraryDrag: null, cameraMode: 'orbit' }),
  setCameraMode: (mode) => set({ cameraMode: mode, draggingId: null }),

  openSpaces: () =>
    set({
      view: 'spaces',
      displayMode: '2d',
      cameraMode: 'orbit',
      projectId: null,
      layoutId: null,
      ...selectionReset,
      tool: 'select',
      ...toolResets,
      pointerWorld: null,
      pointerOverCanvas: false,
      guides: [],
      layoutMenuOpen: false,
      contextMenu: null,
      pendingWallDelete: null,
      past: [],
      future: [],
      libraryDrag: null,
    }),

  openProject: (projectId, layoutId) => {
    const project = useProjectStore.getState().projects.find((item) => item.id === projectId)
    const nextLayoutId = layoutId ?? project?.layouts[0]?.id ?? null
    set({
      view: 'editor',
      displayMode: '2d',
      cameraMode: 'orbit',
      projectId,
      layoutId: nextLayoutId,
      ...selectionReset,
      tool: 'select',
      ...toolResets,
      pointerWorld: null,
      pointerOverCanvas: false,
      guides: [],
      layoutMenuOpen: false,
      contextMenu: null,
      pendingWallDelete: null,
      past: [],
      future: [],
      fitNonce: get().fitNonce + 1,
    })
  },

  setLayoutId: (layoutId) =>
    set({
      layoutId,
      cameraMode: 'orbit',
      ...selectionReset,
      tool: 'select',
      ...toolResets,
      guides: [],
      layoutMenuOpen: false,
      contextMenu: null,
      pendingWallDelete: null,
      past: [],
      future: [],
      fitNonce: get().fitNonce + 1,
    }),

  setSelection: (selection) =>
    set({
      selection,
      selections: selection ? [selection] : [],
      layoutMenuOpen: false,
      contextMenu: null,
    }),
  setSelections: (selections) => {
    const next = uniqueSelections(selections)
    set({
      selections: next,
      selection: next[next.length - 1] ?? null,
      layoutMenuOpen: false,
      contextMenu: null,
    })
  },
  selectOnly: (item) =>
    set({ selection: item, selections: [item], layoutMenuOpen: false, contextMenu: null }),
  toggleSelection: (item) => {
    const current = get().selections
    const exists = current.some((entry) => sameSelection(entry, item))
    const next = uniqueSelections(exists ? current.filter((entry) => !sameSelection(entry, item)) : [...current, item])
    set({
      selections: next,
      selection: next[next.length - 1] ?? null,
      layoutMenuOpen: false,
      contextMenu: null,
    })
  },
  selectObject: (item, additive = false) => {
    if (additive) get().toggleSelection(item)
    else get().selectOnly(item)
  },
  setMarquee: (marquee) => set({ marquee }),
  setClipboard: (clipboard) => {
    persistClipboard(clipboard)
    set({ clipboard })
  },
  setPointerWorld: (point) => set({ pointerWorld: point }),
  setPointerOverCanvas: (value) => set({ pointerOverCanvas: value }),
  setTool: (tool) =>
    set({
      tool,
      libraryTab: tool === 'select' ? get().libraryTab : 'build',
      ...(tool === 'select' ? {} : selectionReset),
      ...toolResets,
      contextMenu: null,
    }),
  setWallDraft: (points) => set({ wallDraft: points }),
  setWallPreview: (point) => set({ wallPreview: point }),
  setMeasureDraft: (point) => set({ measureDraft: point }),
  setMeasurePreview: (point) => set({ measurePreview: point }),
  setMeasureTemp: (value) => set({ measureTemp: value }),
  setCalibrateDraft: (points) => set({ calibrateDraft: points }),
  setLayer: (id, visible) =>
    set((state) => ({
      layers: { ...state.layers, [id]: visible },
      gridEnabled: id === 'grid' ? visible : state.gridEnabled,
    })),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setViewport: (zoom, pan) => set({ zoom, pan }),
  setGridEnabled: (enabled) =>
    set((state) => ({
      gridEnabled: enabled,
      layers: { ...state.layers, grid: enabled },
    })),
  setModifiers: (patch) => set(patch),
  setPanning: (value) => set({ isPanning: value }),
  setDraggingId: (id) => set({ draggingId: id }),
  setDraggingOpeningId: (id) => set({ draggingOpeningId: id }),
  setLibraryTab: (tab) => set({ libraryTab: tab, tool: tab === 'furniture' ? 'select' : get().tool }),
  toggleCategory: (category) =>
    set((state) => ({
      openCategories: state.openCategories.includes(category)
        ? state.openCategories.filter((item) => item !== category)
        : [...state.openCategories, category],
    })),
  setGuides: (guides) => set({ guides }),
  setLayoutMenuOpen: (open) => set({ layoutMenuOpen: open }),
  setContextMenu: (menu) => set({ contextMenu: menu }),
  setPendingWallDelete: (value) => set({ pendingWallDelete: value }),
  setHoverHint: (hint) => set({ hoverHint: hint }),
  cancelTool: () => {
    const { tool, wallDraft, measureDraft, measureTemp, calibrateDraft, selection, selections, marquee } = get()
    if (marquee) {
      set({ marquee: null })
      return
    }
    if (wallDraft.length > 0) {
      set({ ...toolResets })
      return
    }
    if (measureDraft || measureTemp || calibrateDraft.length > 0) {
      set({ ...toolResets })
      return
    }
    if (tool !== 'select') {
      set({ tool: 'select', ...toolResets })
      return
    }
    if (selection || selections.length > 0) set({ ...selectionReset, contextMenu: null })
  },
  requestFit: () => set({ fitNonce: get().fitNonce + 1 }),
  requestThreeFit: () => set({ threeFitNonce: get().threeFitNonce + 1 }),
  setLibraryDrag: (drag) => set({ libraryDrag: drag }),

  captureHistory: () => {
    const snapshot = currentSnapshot()
    if (!snapshot) return
    const last = get().past[get().past.length - 1]
    if (last && snapshotsEqual(last, snapshot)) return
    set((state) => ({
      past: [...state.past, snapshot].slice(-HISTORY_LIMIT),
      future: [],
    }))
  },

  undo: () => {
    const snapshot = currentSnapshot()
    const past = get().past
    if (!snapshot || past.length === 0) return
    const previous = past[past.length - 1]
    useProjectStore.getState().replaceLayout(previous.projectId, previous.layoutId, previous)
    set({
      past: past.slice(0, -1),
      future: [...get().future, snapshot].slice(-HISTORY_LIMIT),
      projectId: previous.projectId,
      layoutId: previous.layoutId,
    })
  },

  redo: () => {
    const snapshot = currentSnapshot()
    const future = get().future
    if (!snapshot || future.length === 0) return
    const next = future[future.length - 1]
    useProjectStore.getState().replaceLayout(next.projectId, next.layoutId, next)
    set({
      future: future.slice(0, -1),
      past: [...get().past, snapshot].slice(-HISTORY_LIMIT),
      projectId: next.projectId,
      layoutId: next.layoutId,
    })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))
