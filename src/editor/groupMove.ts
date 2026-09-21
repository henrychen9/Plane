import type {
  Door,
  EditorSelection,
  Fixture,
  FloorPlan,
  FurnitureItem,
  Layout,
  Outlet,
  Point,
  SwitchDevice,
  Vertex,
  Wall,
  WindowOpening,
} from '../types/spatial'
import { furnitureAABB } from '../utils/geometry'
import { clampOffsetForOpening, clampOffsetOnWall, pointAlongWall } from '../architecture/geometry'
import { nearestWall } from '../architecture/plan'
import { pruneUnusedVertices, refreshPlanGeometry } from '../architecture/vertices'
import { createId } from '../utils/id'
import { isSelected } from './selection'

export type OrphanMountedSnapshot = {
  kind: 'door' | 'window' | 'outlet' | 'switch'
  id: string
  x: number
  y: number
  width?: number
}

export type GroupSnapshot = {
  furniture: Record<string, { x: number; y: number }>
  fixtures: Record<string, { x: number; y: number }>
  vertices: Record<string, { x: number; y: number }>
  orphanMounted: OrphanMountedSnapshot[]
}

function selectedWallIdSet(selections: EditorSelection[]): Set<string> {
  return new Set(selections.filter((item) => item.kind === 'wall').map((item) => item.id))
}

function selectedWallVertexIds(plan: FloorPlan, selections: EditorSelection[]): Set<string> {
  const wallIds = selectedWallIdSet(selections)
  const ids = new Set<string>()
  for (const wall of plan.walls) {
    if (!wallIds.has(wall.id)) continue
    ids.add(wall.startVertexId)
    ids.add(wall.endVertexId)
  }
  return ids
}

/** Duplicate vertices shared between selected and unselected walls so unselected walls stay put. */
export function detachBoundaryVertices(layout: Layout, selections: EditorSelection[]): Layout {
  const selectedWallIds = selectedWallIdSet(selections)
  if (selectedWallIds.size === 0) return layout

  const usage = new Map<string, { selected: boolean; unselected: boolean }>()
  for (const wall of layout.plan.walls) {
    const selected = selectedWallIds.has(wall.id)
    for (const vertexId of [wall.startVertexId, wall.endVertexId]) {
      const entry = usage.get(vertexId) ?? { selected: false, unselected: false }
      if (selected) entry.selected = true
      else entry.unselected = true
      usage.set(vertexId, entry)
    }
  }

  const remaps = new Map<string, string>()
  const copies: Vertex[] = []
  for (const vertex of layout.plan.vertices ?? []) {
    const entry = usage.get(vertex.id)
    if (!entry?.selected || !entry.unselected) continue
    const copy: Vertex = { id: createId('vtx'), x: vertex.x, y: vertex.y }
    copies.push(copy)
    remaps.set(vertex.id, copy.id)
  }
  if (remaps.size === 0) return layout

  const walls = layout.plan.walls.map((wall) => {
    if (!selectedWallIds.has(wall.id)) return wall
    return {
      ...wall,
      startVertexId: remaps.get(wall.startVertexId) ?? wall.startVertexId,
      endVertexId: remaps.get(wall.endVertexId) ?? wall.endVertexId,
    }
  })

  return {
    ...layout,
    plan: refreshPlanGeometry({
      ...layout.plan,
      vertices: [...(layout.plan.vertices ?? []), ...copies],
      walls,
    }),
  }
}

export function snapshotRigidGroup(layout: Layout, selections: EditorSelection[]): GroupSnapshot {
  const furniture: GroupSnapshot['furniture'] = {}
  const fixtures: GroupSnapshot['fixtures'] = {}
  const vertices: GroupSnapshot['vertices'] = {}
  const orphanMounted: OrphanMountedSnapshot[] = []
  const selectedWallIds = selectedWallIdSet(selections)
  const vertexIds = selectedWallVertexIds(layout.plan, selections)

  for (const item of layout.furniture) {
    if (isSelected(selections, 'furniture', item.id)) furniture[item.id] = { x: item.x, y: item.y }
  }
  for (const fixture of layout.plan.fixtures) {
    if (isSelected(selections, 'fixture', fixture.id)) fixtures[fixture.id] = { x: fixture.x, y: fixture.y }
  }
  for (const vertex of layout.plan.vertices ?? []) {
    if (vertexIds.has(vertex.id)) vertices[vertex.id] = { x: vertex.x, y: vertex.y }
  }

  const captureOrphan = (
    kind: OrphanMountedSnapshot['kind'],
    id: string,
    wallId: string,
    offset: number,
    width?: number,
  ) => {
    if (selectedWallIds.has(wallId)) return
    const wall = layout.plan.walls.find((item) => item.id === wallId)
    if (!wall) return
    const point = pointAlongWall(wall, offset)
    orphanMounted.push({ kind, id, x: point.x, y: point.y, width })
  }

  for (const door of layout.plan.doors) {
    if (isSelected(selections, 'door', door.id)) {
      captureOrphan('door', door.id, door.wallId, door.offset, door.width)
    }
  }
  for (const window of layout.plan.windows) {
    if (isSelected(selections, 'window', window.id)) {
      captureOrphan('window', window.id, window.wallId, window.offset, window.width)
    }
  }
  for (const outlet of layout.plan.outlets) {
    if (isSelected(selections, 'outlet', outlet.id)) {
      captureOrphan('outlet', outlet.id, outlet.wallId, outlet.offset)
    }
  }
  for (const item of layout.plan.switches) {
    if (isSelected(selections, 'switch', item.id)) {
      captureOrphan('switch', item.id, item.wallId, item.offset)
    }
  }

  return { furniture, fixtures, vertices, orphanMounted }
}

export function snapshotFreeGroup(layout: Layout, selections: EditorSelection[]): GroupSnapshot {
  return snapshotRigidGroup(layout, selections)
}

function reattachOrphans(plan: FloorPlan, snapshot: GroupSnapshot, dx: number, dy: number): FloorPlan {
  if (snapshot.orphanMounted.length === 0) return plan
  let doors = plan.doors
  let windows = plan.windows
  let outlets = plan.outlets
  let switches = plan.switches

  for (const item of snapshot.orphanMounted) {
    const point = { x: item.x + dx, y: item.y + dy }
    const hit = nearestWall(plan, point, Number.POSITIVE_INFINITY)
    if (!hit) continue
    if (item.kind === 'door') {
      const width = item.width ?? doors.find((entry) => entry.id === item.id)?.width ?? 30
      const offset = clampOffsetForOpening(hit.offset, width, hit.wall)
      doors = doors.map((entry) =>
        entry.id === item.id ? { ...entry, wallId: hit.wall.id, offset } : entry,
      )
    } else if (item.kind === 'window') {
      const width = item.width ?? windows.find((entry) => entry.id === item.id)?.width ?? 36
      const offset = clampOffsetForOpening(hit.offset, width, hit.wall)
      windows = windows.map((entry) =>
        entry.id === item.id ? { ...entry, wallId: hit.wall.id, offset } : entry,
      )
    } else if (item.kind === 'outlet') {
      const offset = clampOffsetOnWall(hit.offset, hit.wall)
      outlets = outlets.map((entry) =>
        entry.id === item.id ? { ...entry, wallId: hit.wall.id, offset } : entry,
      )
    } else {
      const offset = clampOffsetOnWall(hit.offset, hit.wall)
      switches = switches.map((entry) =>
        entry.id === item.id ? { ...entry, wallId: hit.wall.id, offset } : entry,
      )
    }
  }

  return { ...plan, doors, windows, outlets, switches }
}

export function translateLayoutGroup(layout: Layout, snapshot: GroupSnapshot, dx: number, dy: number): Layout {
  const furniture = layout.furniture.map((item) => {
    const origin = snapshot.furniture[item.id]
    return origin ? { ...item, x: origin.x + dx, y: origin.y + dy } : item
  })
  const fixtures = layout.plan.fixtures.map((fixture) => {
    const origin = snapshot.fixtures[fixture.id]
    return origin ? { ...fixture, x: origin.x + dx, y: origin.y + dy } : fixture
  })
  const movedVertices = snapshot.vertices && Object.keys(snapshot.vertices).length > 0
  const vertices = movedVertices
    ? (layout.plan.vertices ?? []).map((vertex) => {
        const origin = snapshot.vertices[vertex.id]
        return origin ? { ...vertex, x: origin.x + dx, y: origin.y + dy } : vertex
      })
    : layout.plan.vertices
  let plan: FloorPlan = {
    ...layout.plan,
    fixtures,
    vertices,
  }
  if (movedVertices) plan = refreshPlanGeometry(plan)
  plan = reattachOrphans(plan, snapshot, dx, dy)
  return { ...layout, furniture, plan }
}

export function applyRigidGroupMove(layout: Layout, selections: EditorSelection[], dx: number, dy: number): Layout {
  const prepared = detachBoundaryVertices(layout, selections)
  return translateLayoutGroup(prepared, snapshotRigidGroup(prepared, selections), dx, dy)
}

type ActiveGroupSession = {
  origin: Point
  selections: EditorSelection[]
  bounds: { x: number; y: number; width: number; depth: number } | null
  snapshot: GroupSnapshot | null
  prepared: boolean
}

let activeGroup: ActiveGroupSession | null = null

export function startRigidGroupSession(
  layout: Layout,
  selections: EditorSelection[],
  origin: Point,
) {
  activeGroup = {
    origin,
    selections: [...selections],
    bounds: selectionBounds(layout, selections),
    snapshot: null,
    prepared: false,
  }
}

export function startFreeGroupDrag(
  layout: Layout,
  selections: EditorSelection[],
  _draggedId: string,
  originX: number,
  originY: number,
) {
  startRigidGroupSession(layout, selections, { x: originX, y: originY })
}

export function activeGroupSession(): ActiveGroupSession | null {
  return activeGroup
}

export function prepareActiveGroupSnapshot(layout: Layout): { layout: Layout; snapshot: GroupSnapshot } | null {
  if (!activeGroup) return null
  if (activeGroup.snapshot) return { layout, snapshot: activeGroup.snapshot }
  const prepared = detachBoundaryVertices(layout, activeGroup.selections)
  const snapshot = snapshotRigidGroup(prepared, activeGroup.selections)
  activeGroup.snapshot = snapshot
  activeGroup.prepared = true
  return { layout: prepared, snapshot }
}

export function endFreeGroupDrag() {
  activeGroup = null
}

export function endRigidGroupDrag() {
  activeGroup = null
}

export function hasActiveGroupDrag(): boolean {
  return activeGroup !== null
}

export function groupDragDidMutate(): boolean {
  return Boolean(activeGroup?.prepared)
}

export function selectionBounds(layout: Layout, selections: EditorSelection[]): { x: number; y: number; width: number; depth: number } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  const include = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const includeBox = (box: { x: number; y: number; width: number; depth: number }) => {
    include(box.x, box.y)
    include(box.x + box.width, box.y + box.depth)
  }

  for (const item of layout.furniture) {
    if (isSelected(selections, 'furniture', item.id)) includeBox(furnitureAABB(item))
  }
  for (const fixture of layout.plan.fixtures) {
    if (isSelected(selections, 'fixture', fixture.id)) {
      includeBox({ x: fixture.x, y: fixture.y, width: fixture.width, depth: fixture.depth })
    }
  }
  for (const wall of layout.plan.walls) {
    if (!isSelected(selections, 'wall', wall.id)) continue
    include(wall.start.x, wall.start.y)
    include(wall.end.x, wall.end.y)
  }
  for (const door of layout.plan.doors) {
    if (!isSelected(selections, 'door', door.id)) continue
    const wall = layout.plan.walls.find((item) => item.id === door.wallId)
    if (!wall) continue
    const a = pointAlongWall(wall, door.offset)
    const b = pointAlongWall(wall, door.offset + door.width)
    include(a.x, a.y)
    include(b.x, b.y)
  }
  for (const window of layout.plan.windows) {
    if (!isSelected(selections, 'window', window.id)) continue
    const wall = layout.plan.walls.find((item) => item.id === window.wallId)
    if (!wall) continue
    includeBox({
      x: Math.min(pointAlongWall(wall, window.offset).x, pointAlongWall(wall, window.offset + window.width).x),
      y: Math.min(pointAlongWall(wall, window.offset).y, pointAlongWall(wall, window.offset + window.width).y),
      width: window.width,
      depth: wall.thickness,
    })
    const start = pointAlongWall(wall, window.offset)
    const end = pointAlongWall(wall, window.offset + window.width)
    include(start.x, start.y)
    include(end.x, end.y)
  }
  for (const outlet of layout.plan.outlets) {
    if (!isSelected(selections, 'outlet', outlet.id)) continue
    const wall = layout.plan.walls.find((item) => item.id === outlet.wallId)
    if (!wall) continue
    const pos = pointAlongWall(wall, outlet.offset)
    include(pos.x, pos.y)
  }
  for (const item of layout.plan.switches) {
    if (!isSelected(selections, 'switch', item.id)) continue
    const wall = layout.plan.walls.find((entry) => entry.id === item.wallId)
    if (!wall) continue
    const pos = pointAlongWall(wall, item.offset)
    include(pos.x, pos.y)
  }

  if (!Number.isFinite(minX)) return null
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), depth: Math.max(1, maxY - minY) }
}

export function removeSelectionsFromLayout(layout: Layout, selections: EditorSelection[]): Layout {
  const furnitureIds = new Set(selections.filter((item) => item.kind === 'furniture').map((item) => item.id))
  const measurementIds = new Set(selections.filter((item) => item.kind === 'measurement').map((item) => item.id))
  const furniture = layout.furniture.filter((item) => !furnitureIds.has(item.id) || item.locked)
  if (layout.plan.architectureLocked) {
    return {
      ...layout,
      furniture,
      plan: {
        ...layout.plan,
        measurements: layout.plan.measurements.filter((item) => !measurementIds.has(item.id)),
      },
    }
  }
  const fixtureIds = new Set(selections.filter((item) => item.kind === 'fixture').map((item) => item.id))
  const wallIds = new Set(selections.filter((item) => item.kind === 'wall').map((item) => item.id))
  const doorIds = new Set(selections.filter((item) => item.kind === 'door').map((item) => item.id))
  const windowIds = new Set(selections.filter((item) => item.kind === 'window').map((item) => item.id))
  const outletIds = new Set(selections.filter((item) => item.kind === 'outlet').map((item) => item.id))
  const switchIds = new Set(selections.filter((item) => item.kind === 'switch').map((item) => item.id))

  let plan: FloorPlan = {
    ...layout.plan,
    fixtures: layout.plan.fixtures.filter((item) => !fixtureIds.has(item.id) || item.locked),
    doors: layout.plan.doors.filter((item) => !doorIds.has(item.id) && !wallIds.has(item.wallId)),
    windows: layout.plan.windows.filter((item) => !windowIds.has(item.id) && !wallIds.has(item.wallId)),
    outlets: layout.plan.outlets.filter((item) => !outletIds.has(item.id) && !wallIds.has(item.wallId)),
    switches: layout.plan.switches.filter((item) => !switchIds.has(item.id) && !wallIds.has(item.wallId)),
    walls: layout.plan.walls.filter((item) => !wallIds.has(item.id) || item.locked),
    measurements: layout.plan.measurements.filter((item) => !measurementIds.has(item.id)),
  }
  plan = pruneUnusedVertices(plan)
  return { ...layout, furniture, plan }
}

export type CopiedArchitecture = {
  vertices: Vertex[]
  walls: Wall[]
  doors: Door[]
  windows: WindowOpening[]
  outlets: Outlet[]
  switches: SwitchDevice[]
}

export function collectCopiedItems(layout: Layout, selections: EditorSelection[]): {
  furniture: FurnitureItem[]
  fixtures: Fixture[]
  architecture: CopiedArchitecture
  skippedMounted: number
} {
  const wallIds = new Set(selections.filter((item) => item.kind === 'wall').map((item) => item.id))
  const furniture = layout.furniture.filter((item) => isSelected(selections, 'furniture', item.id))
  const fixtures = layout.plan.fixtures.filter((item) => isSelected(selections, 'fixture', item.id))
  const walls = layout.plan.walls.filter((item) => wallIds.has(item.id))
  const vertexIds = new Set<string>()
  for (const wall of walls) {
    vertexIds.add(wall.startVertexId)
    vertexIds.add(wall.endVertexId)
  }
  const vertices = (layout.plan.vertices ?? []).filter((item) => vertexIds.has(item.id))

  let skippedMounted = 0
  const takeMounted = <T extends { id: string; wallId: string }>(items: T[], kind: EditorSelection['kind']): T[] => {
    const next: T[] = []
    for (const item of items) {
      if (!isSelected(selections, kind, item.id)) continue
      if (!wallIds.has(item.wallId)) {
        skippedMounted += 1
        continue
      }
      next.push(item)
    }
    return next
  }

  return {
    furniture,
    fixtures,
    architecture: {
      vertices,
      walls,
      doors: takeMounted(layout.plan.doors, 'door'),
      windows: takeMounted(layout.plan.windows, 'window'),
      outlets: takeMounted(layout.plan.outlets, 'outlet'),
      switches: takeMounted(layout.plan.switches, 'switch'),
    },
    skippedMounted,
  }
}

export function translatePoint(point: Point, dx: number, dy: number): Point {
  return { x: point.x + dx, y: point.y + dy }
}
