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
import { pointAlongWall } from '../architecture/geometry'
import { pruneUnusedVertices } from '../architecture/vertices'
import { isSelected } from './selection'

export type GroupSnapshot = {
  furniture: Record<string, { x: number; y: number }>
  fixtures: Record<string, { x: number; y: number }>
}

export function snapshotFreeGroup(layout: Layout, selections: EditorSelection[]): GroupSnapshot {
  const furniture: GroupSnapshot['furniture'] = {}
  const fixtures: GroupSnapshot['fixtures'] = {}
  for (const item of layout.furniture) {
    if (isSelected(selections, 'furniture', item.id)) furniture[item.id] = { x: item.x, y: item.y }
  }
  for (const fixture of layout.plan.fixtures) {
    if (isSelected(selections, 'fixture', fixture.id)) fixtures[fixture.id] = { x: fixture.x, y: fixture.y }
  }
  return { furniture, fixtures }
}

let activeGroup: {
  snapshot: GroupSnapshot
  draggedId: string
  originX: number
  originY: number
} | null = null

export function startFreeGroupDrag(
  layout: Layout,
  selections: EditorSelection[],
  draggedId: string,
  originX: number,
  originY: number,
) {
  activeGroup = {
    snapshot: snapshotFreeGroup(layout, selections),
    draggedId,
    originX,
    originY,
  }
}

export function activeGroupDelta(x: number, y: number): { dx: number; dy: number; snapshot: GroupSnapshot } | null {
  if (!activeGroup) return null
  return {
    dx: x - activeGroup.originX,
    dy: y - activeGroup.originY,
    snapshot: activeGroup.snapshot,
  }
}

export function endFreeGroupDrag() {
  activeGroup = null
}

export function hasActiveGroupDrag(): boolean {
  return activeGroup !== null
}

export function translateLayoutGroup(layout: Layout, snapshot: GroupSnapshot, dx: number, dy: number): Layout {
  return {
    ...layout,
    furniture: layout.furniture.map((item) => {
      const origin = snapshot.furniture[item.id]
      return origin ? { ...item, x: origin.x + dx, y: origin.y + dy } : item
    }),
    plan: {
      ...layout.plan,
      fixtures: layout.plan.fixtures.map((fixture) => {
        const origin = snapshot.fixtures[fixture.id]
        return origin ? { ...fixture, x: origin.x + dx, y: origin.y + dy } : fixture
      }),
    },
  }
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
