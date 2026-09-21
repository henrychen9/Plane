import { clientToWorld } from '../canvas/coords'
import { DUPLICATE_OFFSET } from './constants'
import type { ClipboardPayload } from './clipboardModel'
import {
  applyRigidGroupMove,
  collectCopiedItems,
  removeSelectionsFromLayout,
  selectionBounds,
  snapshotFreeGroup,
  translateLayoutGroup,
  type CopiedArchitecture,
} from './groupMove'
import { canGroupTranslate, canNudgeMounted, canRigidGroupDrag, uniqueSelections } from './selection'
import { useEditorStore } from '../state/editorStore'
import { getLayout, useProjectStore } from '../state/projectStore'
import type { EditorSelection, Point } from '../types/spatial'
import { clone } from '../utils/geometry'
import { createId } from '../utils/id'
import { arrowAlongWall, nudgeMountedPlan } from '../architecture/mountedMove'

export type { ClipboardPayload } from './clipboardModel'

function currentLayout() {
  const editor = useEditorStore.getState()
  if (!editor.projectId || !editor.layoutId) return null
  const layout = getLayout(editor.projectId, editor.layoutId)
  if (!layout) return null
  return { editor, layout, projectId: editor.projectId, layoutId: editor.layoutId }
}

function activeSelections(): EditorSelection[] {
  const editor = useEditorStore.getState()
  if (editor.selections.length > 0) return editor.selections
  return editor.selection ? [editor.selection] : []
}

function payloadFromSelection(
  projectId: string,
  layoutId: string,
  layout: NonNullable<ReturnType<typeof getLayout>>,
  selections: EditorSelection[],
): ClipboardPayload | null {
  if (selections.length === 0) return null
  const collected = collectCopiedItems(layout, selections)
  const empty =
    collected.furniture.length === 0 &&
    collected.fixtures.length === 0 &&
    collected.architecture.walls.length === 0
  if (empty) return null
  const bounds = selectionBounds(layout, selections) ?? { x: 0, y: 0, width: 1, depth: 1 }
  return {
    copiedAt: Date.now(),
    sourceProjectId: projectId,
    sourceLayoutId: layoutId,
    relativeOrigin: { x: bounds.x, y: bounds.y },
    bounds: { width: bounds.width, depth: bounds.depth },
    furniture: clone(collected.furniture),
    fixtures: clone(collected.fixtures),
    vertices: clone(collected.architecture.vertices),
    walls: clone(collected.architecture.walls),
    doors: clone(collected.architecture.doors),
    windows: clone(collected.architecture.windows),
    outlets: clone(collected.architecture.outlets),
    switches: clone(collected.architecture.switches),
    skippedMounted: collected.skippedMounted,
    pasteCount: 0,
  }
}

export function copySelection(): boolean {
  const ctx = currentLayout()
  if (!ctx) return false
  const selections = activeSelections()
  const payload = payloadFromSelection(ctx.projectId, ctx.layoutId, ctx.layout, selections)
  if (!payload) {
    if (selections.some((item) => item.kind === 'door' || item.kind === 'window' || item.kind === 'outlet' || item.kind === 'switch')) {
      useEditorStore.getState().setHoverHint('Wall-mounted items need their wall to copy.')
    }
    return false
  }
  useEditorStore.getState().setClipboard(payload)
  if (payload.skippedMounted > 0) {
    useEditorStore.getState().setHoverHint('Some wall-mounted items were skipped.')
  }
  return true
}

export function deleteSelection(): boolean {
  const ctx = currentLayout()
  if (!ctx) return false
  const selections = activeSelections()
  if (selections.length === 0) return false
  if (ctx.layout.plan.architectureLocked && selections.some((item) => item.kind !== 'furniture' && item.kind !== 'measurement')) {
    const furnitureOnly = selections.filter((item) => item.kind === 'furniture' || item.kind === 'measurement')
    if (furnitureOnly.length === 0) return false
  }
  useEditorStore.getState().captureHistory()
  useProjectStore.getState().patchLayout(ctx.projectId, ctx.layoutId, (layout) =>
    removeSelectionsFromLayout(layout, selections),
  )
  useEditorStore.getState().setSelections([])
  return true
}

export function cutSelection(): boolean {
  const ctx = currentLayout()
  if (!ctx) return false
  const selections = activeSelections()
  const payload = payloadFromSelection(ctx.projectId, ctx.layoutId, ctx.layout, selections)
  if (!payload) return false
  useEditorStore.getState().setClipboard(payload)
  useEditorStore.getState().captureHistory()
  useProjectStore.getState().patchLayout(ctx.projectId, ctx.layoutId, (layout) =>
    removeSelectionsFromLayout(layout, selections),
  )
  useEditorStore.getState().setSelections([])
  if (payload.skippedMounted > 0) {
    useEditorStore.getState().setHoverHint('Some wall-mounted items were skipped.')
  }
  return true
}

function remapArchitecture(source: CopiedArchitecture, dx: number, dy: number): CopiedArchitecture {
  const vertexMap = new Map<string, string>()
  const vertices = source.vertices.map((vertex) => {
    const id = createId('vtx')
    vertexMap.set(vertex.id, id)
    return { ...vertex, id, x: vertex.x + dx, y: vertex.y + dy }
  })
  const wallMap = new Map<string, string>()
  const walls = source.walls.flatMap((wall) => {
    const startVertexId = vertexMap.get(wall.startVertexId)
    const endVertexId = vertexMap.get(wall.endVertexId)
    if (!startVertexId || !endVertexId) return []
    const id = createId('wal')
    wallMap.set(wall.id, id)
    const start = vertices.find((item) => item.id === startVertexId)!
    const end = vertices.find((item) => item.id === endVertexId)!
    return [
      {
        ...wall,
        id,
        startVertexId,
        endVertexId,
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
      },
    ]
  })
  const remapMounted = <T extends { id: string; wallId: string }>(items: T[], prefix: string): T[] =>
    items.flatMap((item) => {
      const wallId = wallMap.get(item.wallId)
      if (!wallId) return []
      return [{ ...item, id: createId(prefix), wallId }]
    })
  return {
    vertices,
    walls,
    doors: remapMounted(source.doors, 'dor'),
    windows: remapMounted(source.windows, 'win'),
    outlets: remapMounted(source.outlets, 'out'),
    switches: remapMounted(source.switches, 'sw'),
  }
}

function pasteOrigin(payload: ClipboardPayload): Point {
  const editor = useEditorStore.getState()
  const offset = payload.pasteCount * (DUPLICATE_OFFSET / 2)
  const centerOn = (point: Point): Point => ({
    x: point.x - payload.bounds.width / 2 + offset,
    y: point.y - payload.bounds.depth / 2 + offset,
  })
  if (editor.pointerOverCanvas && editor.pointerWorld) return centerOn(editor.pointerWorld)
  const canvas = document.querySelector('[data-plane-canvas]')
  if (canvas) {
    const rect = canvas.getBoundingClientRect()
    const world = clientToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, rect, editor.pan, editor.zoom)
    return centerOn(world)
  }
  return { x: payload.relativeOrigin.x + DUPLICATE_OFFSET + offset, y: payload.relativeOrigin.y + DUPLICATE_OFFSET + offset }
}

export function pasteClipboard(): boolean {
  const ctx = currentLayout()
  const payload = useEditorStore.getState().clipboard
  if (!ctx || !payload) return false
  const origin = pasteOrigin(payload)
  const dx = origin.x - payload.relativeOrigin.x
  const dy = origin.y - payload.relativeOrigin.y
  const furniture = payload.furniture.map((item) => ({
    ...clone(item),
    id: createId('fur'),
    x: item.x + dx,
    y: item.y + dy,
  }))
  const fixtures = payload.fixtures.map((item) => ({
    ...clone(item),
    id: createId('fix'),
    x: item.x + dx,
    y: item.y + dy,
  }))
  const architecture = remapArchitecture(payload, dx, dy)
  useEditorStore.getState().captureHistory()
  useProjectStore.getState().patchLayout(ctx.projectId, ctx.layoutId, (layout) => ({
    ...layout,
    furniture: [...layout.furniture, ...furniture],
    plan: {
      ...layout.plan,
      vertices: [...(layout.plan.vertices ?? []), ...architecture.vertices],
      walls: [...layout.plan.walls, ...architecture.walls],
      doors: [...layout.plan.doors, ...architecture.doors],
      windows: [...layout.plan.windows, ...architecture.windows],
      outlets: [...layout.plan.outlets, ...architecture.outlets],
      switches: [...layout.plan.switches, ...architecture.switches],
      fixtures: [...layout.plan.fixtures, ...fixtures],
    },
  }))
  const nextSelection = uniqueSelections([
    ...furniture.map((item) => ({ kind: 'furniture' as const, id: item.id })),
    ...fixtures.map((item) => ({ kind: 'fixture' as const, id: item.id })),
    ...architecture.walls.map((item) => ({ kind: 'wall' as const, id: item.id })),
    ...architecture.doors.map((item) => ({ kind: 'door' as const, id: item.id })),
    ...architecture.windows.map((item) => ({ kind: 'window' as const, id: item.id })),
    ...architecture.outlets.map((item) => ({ kind: 'outlet' as const, id: item.id })),
    ...architecture.switches.map((item) => ({ kind: 'switch' as const, id: item.id })),
  ])
  useEditorStore.getState().setSelections(nextSelection)
  useEditorStore.getState().setClipboard({ ...payload, pasteCount: payload.pasteCount + 1 })
  if (payload.skippedMounted > 0) {
    useEditorStore.getState().setHoverHint('Some wall-mounted items were skipped.')
  }
  return true
}

export function duplicateSelection(): boolean {
  const ctx = currentLayout()
  if (!ctx) return false
  const selections = activeSelections()
  const payload = payloadFromSelection(ctx.projectId, ctx.layoutId, ctx.layout, selections)
  if (!payload) return false
  const dx = DUPLICATE_OFFSET
  const dy = DUPLICATE_OFFSET
  const furniture = payload.furniture.map((item) => ({
    ...clone(item),
    id: createId('fur'),
    x: item.x + dx,
    y: item.y + dy,
    locked: false,
  }))
  const fixtures = payload.fixtures.map((item) => ({
    ...clone(item),
    id: createId('fix'),
    x: item.x + dx,
    y: item.y + dy,
    locked: false,
  }))
  const architecture = remapArchitecture(payload, dx, dy)
  useEditorStore.getState().captureHistory()
  useProjectStore.getState().patchLayout(ctx.projectId, ctx.layoutId, (layout) => ({
    ...layout,
    furniture: [...layout.furniture, ...furniture],
    plan: {
      ...layout.plan,
      vertices: [...(layout.plan.vertices ?? []), ...architecture.vertices],
      walls: [...layout.plan.walls, ...architecture.walls],
      doors: [...layout.plan.doors, ...architecture.doors],
      windows: [...layout.plan.windows, ...architecture.windows],
      outlets: [...layout.plan.outlets, ...architecture.outlets],
      switches: [...layout.plan.switches, ...architecture.switches],
      fixtures: [...layout.plan.fixtures, ...fixtures],
    },
  }))
  useEditorStore.getState().setSelections(
    uniqueSelections([
      ...furniture.map((item) => ({ kind: 'furniture' as const, id: item.id })),
      ...fixtures.map((item) => ({ kind: 'fixture' as const, id: item.id })),
      ...architecture.walls.map((item) => ({ kind: 'wall' as const, id: item.id })),
      ...architecture.doors.map((item) => ({ kind: 'door' as const, id: item.id })),
      ...architecture.windows.map((item) => ({ kind: 'window' as const, id: item.id })),
      ...architecture.outlets.map((item) => ({ kind: 'outlet' as const, id: item.id })),
      ...architecture.switches.map((item) => ({ kind: 'switch' as const, id: item.id })),
    ]),
  )
  if (payload.skippedMounted > 0) {
    useEditorStore.getState().setHoverHint('Some wall-mounted items were skipped.')
  }
  return true
}

export function nudgeSelection(dx: number, dy: number): boolean {
  const ctx = currentLayout()
  if (!ctx) return false
  const selections = activeSelections()
  if (canRigidGroupDrag(selections)) {
    useEditorStore.getState().captureHistory()
    useProjectStore.getState().patchLayout(
      ctx.projectId,
      ctx.layoutId,
      (layout) => applyRigidGroupMove(layout, selections, dx, dy),
    )
    return true
  }
  if (canNudgeMounted(selections)) {
    if (ctx.layout.plan.architectureLocked) return false
    const along = arrowAlongWall(dx, dy)
    if (along === 0) return false
    useEditorStore.getState().captureHistory()
    useProjectStore.getState().updatePlan(
      ctx.projectId,
      ctx.layoutId,
      (plan) => nudgeMountedPlan(plan, selections, along),
      { rebuild: false },
    )
    return true
  }
  if (!canGroupTranslate(selections) && selections.some((item) => item.kind !== 'furniture' && item.kind !== 'fixture')) {
    if (!selections.some((item) => item.kind === 'furniture' || item.kind === 'fixture')) return false
  }
  const snapshot = snapshotFreeGroup(ctx.layout, selections)
  if (Object.keys(snapshot.furniture).length === 0 && Object.keys(snapshot.fixtures).length === 0) return false
  useEditorStore.getState().captureHistory()
  useProjectStore.getState().patchLayout(
    ctx.projectId,
    ctx.layoutId,
    (layout) => translateLayoutGroup(layout, snapshot, dx, dy),
    { rebuild: false },
  )
  return true
}
