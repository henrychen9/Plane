import { DEFAULT_WALL_HEIGHT, WALL_THICKNESS } from '../editor/constants'
import { getCatalogItem } from '../catalog/furniture'
import type {
  DetectedRoom,
  Door,
  Fixture,
  FloorPlan,
  FurnitureItem,
  Layout,
  Outlet,
  Point,
  Room,
  SwitchDevice,
  Wall,
  WindowOpening,
} from '../types/spatial'
import { createId } from '../utils/id'
import {
  clampOffsetForOpening,
  distance,
  pointAlongWall,
  projectOnWall,
  wallDirection,
  wallLength,
} from './geometry'
import { detectRooms } from './rooms'
import {
  getOrCreateVertex,
  mergeVertexIfNearby,
  migrateVertices,
  pruneUnusedVertices,
  refreshPlanGeometry,
  setVertexPosition,
  translateVertices,
  VERTEX_MERGE_TOLERANCE,
} from './vertices'

export function emptyPlan(): FloorPlan {
  return {
    id: createId('pln'),
    vertices: [],
    walls: [],
    doors: [],
    windows: [],
    outlets: [],
    switches: [],
    fixtures: [],
    rooms: [],
    measurements: [],
  }
}

export function rectToPlan(width: number, depth: number, wallHeight = DEFAULT_WALL_HEIGHT): FloorPlan {
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: depth },
    { x: 0, y: depth },
  ]
  const vertices = corners.map((point) => ({ id: createId('vtx'), x: point.x, y: point.y }))
  const walls: Wall[] = vertices.map((start, index) => {
    const end = vertices[(index + 1) % vertices.length]
    return {
      id: createId('wal'),
      startVertexId: start.id,
      endVertexId: end.id,
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      thickness: WALL_THICKNESS,
      height: wallHeight,
      type: 'exterior',
      locked: false,
    }
  })
  return finalizePlan({
    ...emptyPlan(),
    vertices,
    walls,
  })
}

export function layoutBounds(layout: Layout): Room {
  const plan = layout.plan
  if (!plan?.walls.length) return layout.room
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const wall of plan.walls) {
    minX = Math.min(minX, wall.start.x, wall.end.x)
    minY = Math.min(minY, wall.start.y, wall.end.y)
    maxX = Math.max(maxX, wall.start.x, wall.end.x)
    maxY = Math.max(maxY, wall.start.y, wall.end.y)
  }
  if (!Number.isFinite(minX)) return layout.room
  return {
    width: Math.max(36, maxX - minX),
    depth: Math.max(36, maxY - minY),
    wallHeight: layout.room.wallHeight,
  }
}

export function planOrigin(plan: FloorPlan): Point {
  if (!plan.walls.length) return { x: 0, y: 0 }
  let minX = Infinity
  let minY = Infinity
  for (const wall of plan.walls) {
    minX = Math.min(minX, wall.start.x, wall.end.x)
    minY = Math.min(minY, wall.start.y, wall.end.y)
  }
  return { x: Number.isFinite(minX) ? minX : 0, y: Number.isFinite(minY) ? minY : 0 }
}

export function finalizePlan(plan: FloorPlan): FloorPlan {
  const next = refreshPlanGeometry(plan)
  const rooms = detectRooms(next.walls, plan.rooms)
  return { ...next, rooms }
}

export function migrateFurnitureItem(item: FurnitureItem): FurnitureItem {
  const catalog = getCatalogItem(item.type)
  const shape = item.shape ?? catalog?.shape ?? 'rectangle'
  let shapeData = item.shapeData ?? catalog?.shapeData
  let width = item.width
  let depth = item.depth
  if (shape === 'circle') {
    const diameter = Math.max(item.width, item.depth)
    width = diameter
    depth = diameter
  }
  if (shape === 'lShape') {
    shapeData = {
      ...shapeData,
      returnLength: item.shapeData?.returnLength ?? item.depth,
      thickness: item.shapeData?.thickness ?? catalog?.shapeData?.thickness ?? 24,
    }
  }
  return { ...item, shape, shapeData, width, depth }
}

export function migrateLayout(layout: Layout): Layout {
  const raw = layout as Layout & { plan?: FloorPlan }
  const furniture = (layout.furniture ?? []).map(migrateFurnitureItem)
  if (raw.plan?.walls?.length) {
    const plan = finalizePlan(migrateVertices(raw.plan))
    return {
      ...layout,
      furniture,
      plan,
      room: { ...layoutBounds({ ...layout, plan }), wallHeight: layout.room.wallHeight },
    }
  }
  if (raw.plan) {
    const plan = finalizePlan(migrateVertices({ ...raw.plan, vertices: raw.plan.vertices ?? [] }))
    return { ...layout, furniture, plan, room: { ...layout.room } }
  }
  const plan = rectToPlan(layout.room.width, layout.room.depth, layout.room.wallHeight)
  return { ...layout, furniture, plan, room: { ...layout.room } }
}

export function isAxisAlignedRectangle(plan: FloorPlan): boolean {
  if (plan.walls.length !== 4) return false
  return plan.walls.every((wall) => {
    const deg = Math.abs((Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x) * 180) / Math.PI)
    const aligned = Math.round(deg) % 180
    return aligned === 0 || aligned === 90
  })
}

export function resizeRectPlan(plan: FloorPlan, width: number, depth: number): FloorPlan {
  const origin = planOrigin(plan)
  let minX = origin.x
  let minY = origin.y
  let maxX = origin.x
  let maxY = origin.y
  for (const wall of plan.walls) {
    minX = Math.min(minX, wall.start.x, wall.end.x)
    minY = Math.min(minY, wall.start.y, wall.end.y)
    maxX = Math.max(maxX, wall.start.x, wall.end.x)
    maxY = Math.max(maxY, wall.start.y, wall.end.y)
  }
  const oldW = Math.max(1, maxX - minX)
  const oldH = Math.max(1, maxY - minY)
  const sx = width / oldW
  const sy = depth / oldH
  const oldLengths = new Map(plan.walls.map((wall) => [wall.id, wallLength(wall)]))
  const vertices = (plan.vertices ?? []).map((vertex) => ({
    ...vertex,
    x: minX + (vertex.x - minX) * sx,
    y: minY + (vertex.y - minY) * sy,
  }))
  const next = refreshPlanGeometry({ ...plan, vertices })
  const remapOffset = (wallId: string, offset: number) => {
    const oldLen = oldLengths.get(wallId) ?? 1
    const wall = next.walls.find((item) => item.id === wallId)
    const nextLen = wall ? wallLength(wall) : oldLen
    return offset * (nextLen / (oldLen || 1))
  }
  return finalizePlan({
    ...next,
    doors: next.doors.map((item) => ({ ...item, offset: remapOffset(item.wallId, item.offset) })),
    windows: next.windows.map((item) => ({ ...item, offset: remapOffset(item.wallId, item.offset) })),
    outlets: next.outlets.map((item) => ({ ...item, offset: remapOffset(item.wallId, item.offset) })),
    switches: next.switches.map((item) => ({ ...item, offset: remapOffset(item.wallId, item.offset) })),
  })
}

export function addWall(plan: FloorPlan, start: Point, end: Point, extras?: Partial<Wall>): FloorPlan {
  if (distance(start, end) < 2) return plan
  let next = plan
  const startVertex = getOrCreateVertex(next, start)
  next = startVertex.plan
  const endVertex = getOrCreateVertex(next, end)
  next = endVertex.plan
  if (startVertex.id === endVertex.id) return plan
  const startPoint = next.vertices.find((vertex) => vertex.id === startVertex.id) ?? start
  const endPoint = next.vertices.find((vertex) => vertex.id === endVertex.id) ?? end
  const wall: Wall = {
    id: createId('wal'),
    startVertexId: startVertex.id,
    endVertexId: endVertex.id,
    start: { x: startPoint.x, y: startPoint.y },
    end: { x: endPoint.x, y: endPoint.y },
    thickness: extras?.thickness ?? WALL_THICKNESS,
    height: extras?.height ?? DEFAULT_WALL_HEIGHT,
    type: extras?.type ?? 'interior',
    locked: extras?.locked ?? false,
  }
  return finalizePlan({ ...next, walls: [...next.walls, wall] })
}

export function updateWall(plan: FloorPlan, id: string, patch: Partial<Wall>): FloorPlan {
  const wall = plan.walls.find((item) => item.id === id)
  if (!wall) return plan
  let next = plan
  if (patch.start) next = setVertexPosition(next, wall.startVertexId, patch.start)
  if (patch.end) next = setVertexPosition(next, wall.endVertexId, patch.end)
  const rest = { ...patch }
  delete rest.start
  delete rest.end
  delete rest.startVertexId
  delete rest.endVertexId
  if (Object.keys(rest).length > 0) {
    next = {
      ...next,
      walls: next.walls.map((item) => (item.id === id ? { ...item, ...rest } : item)),
    }
  }
  return finalizePlan(next)
}

export function moveVertex(plan: FloorPlan, from: Point, to: Point): FloorPlan {
  const vertex = (plan.vertices ?? []).find((item) => distance(item, from) <= VERTEX_MERGE_TOLERANCE + 0.35)
  if (!vertex) return plan
  return finalizePlan(setVertexPosition(plan, vertex.id, to))
}

export function translateWall(plan: FloorPlan, id: string, dx: number, dy: number): FloorPlan {
  const wall = plan.walls.find((item) => item.id === id)
  if (!wall) return plan
  return finalizePlan(translateVertices(plan, [wall.startVertexId, wall.endVertexId], dx, dy))
}

export function setWallLength(plan: FloorPlan, id: string, length: number): FloorPlan {
  const wall = plan.walls.find((item) => item.id === id)
  if (!wall || length < 4) return plan
  const current = wallLength(wall)
  if (current < 0.001) return plan
  const scale = length / current
  const end = {
    x: wall.start.x + (wall.end.x - wall.start.x) * scale,
    y: wall.start.y + (wall.end.y - wall.start.y) * scale,
  }
  return finalizePlan(setVertexPosition(plan, wall.endVertexId, end))
}

export function setWallAngle(plan: FloorPlan, id: string, degrees: number): FloorPlan {
  const wall = plan.walls.find((item) => item.id === id)
  if (!wall) return plan
  const len = wallLength(wall)
  const rad = (degrees * Math.PI) / 180
  const end = {
    x: wall.start.x + Math.cos(rad) * len,
    y: wall.start.y + Math.sin(rad) * len,
  }
  return finalizePlan(setVertexPosition(plan, wall.endVertexId, end))
}

export function splitWallAt(plan: FloorPlan, wallId: string, offset: number): FloorPlan {
  const wall = plan.walls.find((item) => item.id === wallId)
  if (!wall) return plan
  const len = wallLength(wall)
  if (offset < 4 || offset > len - 4) return plan
  const split = pointAlongWall(wall, offset)
  const created = getOrCreateVertex(plan, split, 0.05)
  const midId = created.id
  const first: Wall = { ...wall, endVertexId: midId, end: split }
  const second: Wall = {
    ...wall,
    id: createId('wal'),
    startVertexId: midId,
    start: split,
  }
  const remap = <T extends { wallId: string; offset: number; width?: number }>(items: T[]): T[] =>
    items.flatMap((item) => {
      if (item.wallId !== wallId) return [item]
      const width = item.width ?? 0
      if (item.offset + width <= offset) return [item]
      if (item.offset >= offset) return [{ ...item, wallId: second.id, offset: item.offset - offset }]
      return [item]
    })

  return finalizePlan(
    refreshPlanGeometry({
      ...created.plan,
      walls: [...created.plan.walls.filter((item) => item.id !== wallId), first, second],
      doors: remap(plan.doors),
      windows: remap(plan.windows),
      outlets: remap(plan.outlets),
      switches: remap(plan.switches),
    }),
  )
}

export function deleteWall(plan: FloorPlan, wallId: string): FloorPlan {
  return finalizePlan(
    pruneUnusedVertices({
      ...plan,
      walls: plan.walls.filter((wall) => wall.id !== wallId),
      doors: plan.doors.filter((item) => item.wallId !== wallId),
      windows: plan.windows.filter((item) => item.wallId !== wallId),
      outlets: plan.outlets.filter((item) => item.wallId !== wallId),
      switches: plan.switches.filter((item) => item.wallId !== wallId),
    }),
  )
}

export function attachedCount(plan: FloorPlan, wallId: string): number {
  return (
    plan.doors.filter((item) => item.wallId === wallId).length +
    plan.windows.filter((item) => item.wallId === wallId).length +
    plan.outlets.filter((item) => item.wallId === wallId).length +
    plan.switches.filter((item) => item.wallId === wallId).length
  )
}

export function nearestWall(plan: FloorPlan, point: Point, maxDist = 14): { wall: Wall; offset: number } | null {
  let best: { wall: Wall; offset: number; distance: number } | null = null
  for (const wall of plan.walls) {
    const hit = projectOnWall(point, wall)
    if (hit.distance > maxDist) continue
    if (!best || hit.distance < best.distance) best = { wall, offset: hit.offset, distance: hit.distance }
  }
  return best ? { wall: best.wall, offset: best.offset } : null
}

export function nearestEndpoint(plan: FloorPlan, point: Point, maxDist: number): Point | null {
  let best: Point | null = null
  let bestDist = maxDist
  for (const vertex of plan.vertices ?? []) {
    const dist = distance(point, vertex)
    if (dist < bestDist) {
      best = { x: vertex.x, y: vertex.y }
      bestDist = dist
    }
  }
  return best
}

export function joinOrSplitAtPoint(
  plan: FloorPlan,
  point: Point,
  threshold: number,
): { plan: FloorPlan; point: Point } {
  const end = nearestEndpoint(plan, point, threshold)
  if (end) return { plan, point: { ...end } }
  const hit = nearestWall(plan, point, threshold)
  if (hit) {
    const len = wallLength(hit.wall)
    if (hit.offset > 4 && hit.offset < len - 4) {
      const splitPoint = pointAlongWall(hit.wall, hit.offset)
      return { plan: splitWallAt(plan, hit.wall.id, hit.offset), point: splitPoint }
    }
    const projected = projectOnWall(point, hit.wall)
    return { plan, point: projected.point }
  }
  return { plan, point }
}

export function addDoor(plan: FloorPlan, wallId: string, offset: number): FloorPlan {
  const wall = plan.walls.find((item) => item.id === wallId)
  if (!wall) return plan
  const width = 30
  const door: Door = {
    id: createId('dor'),
    wallId,
    offset: clampOffsetForOpening(offset - width / 2, width, wall),
    width,
    type: 'hinged',
    hingeSide: 'start',
    swingDirection: 'left',
  }
  return { ...plan, doors: [...plan.doors, door] }
}

export function addWindow(plan: FloorPlan, wallId: string, offset: number): FloorPlan {
  const wall = plan.walls.find((item) => item.id === wallId)
  if (!wall) return plan
  const width = 36
  const window: WindowOpening = {
    id: createId('win'),
    wallId,
    offset: clampOffsetForOpening(offset - width / 2, width, wall),
    width,
    sillHeight: 36,
    height: 48,
  }
  return { ...plan, windows: [...plan.windows, window] }
}

export function addOutlet(plan: FloorPlan, wallId: string, offset: number): FloorPlan {
  const outlet: Outlet = { id: createId('out'), wallId, offset, type: 'standard' }
  return { ...plan, outlets: [...plan.outlets, outlet] }
}

export function addSwitch(plan: FloorPlan, wallId: string, offset: number): FloorPlan {
  const item: SwitchDevice = { id: createId('sw'), wallId, offset }
  return { ...plan, switches: [...plan.switches, item] }
}

export function addFixture(plan: FloorPlan, fixture: Fixture): FloorPlan {
  return { ...plan, fixtures: [...plan.fixtures, fixture] }
}

export function totalEnclosedArea(rooms: DetectedRoom[]): number {
  return rooms.reduce((sum, room) => sum + room.area, 0)
}

export function layoutFitBounds(layout: Layout): { x: number; y: number; width: number; depth: number } {
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
  for (const wall of layout.plan?.walls ?? []) {
    include(wall.start.x, wall.start.y)
    include(wall.end.x, wall.end.y)
  }
  for (const item of layout.furniture) {
    include(item.x, item.y)
    include(item.x + item.width, item.y + item.depth)
  }
  for (const item of layout.plan?.fixtures ?? []) {
    include(item.x, item.y)
    include(item.x + item.width, item.y + item.depth)
  }
  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: layout.room.width, depth: layout.room.depth }
  }
  const pad = 18
  return {
    x: minX - pad,
    y: minY - pad,
    width: Math.max(48, maxX - minX + pad * 2),
    depth: Math.max(48, maxY - minY + pad * 2),
  }
}

export function joinNearbyVertices(plan: FloorPlan, point: Point, threshold: number): FloorPlan {
  const vertex = (plan.vertices ?? []).find((item) => distance(item, point) <= threshold)
  if (!vertex) return plan
  return finalizePlan(mergeVertexIfNearby(plan, vertex.id, threshold))
}

export function duplicateWall(plan: FloorPlan, id: string): FloorPlan {
  const wall = plan.walls.find((item) => item.id === id)
  if (!wall) return plan
  const dir = wallDirection(wall)
  const normal = { x: -dir.y, y: dir.x }
  const offset = Math.max(12, wall.thickness + 8)
  return addWall(
    plan,
    { x: wall.start.x + normal.x * offset, y: wall.start.y + normal.y * offset },
    { x: wall.end.x + normal.x * offset, y: wall.end.y + normal.y * offset },
    { thickness: wall.thickness, height: wall.height, type: wall.type },
  )
}

export function renameDetectedRoom(plan: FloorPlan, roomId: string, name: string): FloorPlan {
  return {
    ...plan,
    rooms: plan.rooms.map((room) => (room.id === roomId ? { ...room, name } : room)),
  }
}

export function updateRoomMeta(
  plan: FloorPlan,
  roomId: string,
  patch: Partial<Pick<DetectedRoom, 'name' | 'floorMaterial'>>,
): FloorPlan {
  return {
    ...plan,
    rooms: plan.rooms.map((room) => (room.id === roomId ? { ...room, ...patch } : room)),
  }
}

export function addMeasurement(plan: FloorPlan, start: Point, end: Point): FloorPlan {
  if (distance(start, end) < 1) return plan
  return {
    ...plan,
    measurements: [...plan.measurements, { id: createId('msr'), start: { ...start }, end: { ...end } }],
  }
}

export function deleteMeasurement(plan: FloorPlan, id: string): FloorPlan {
  return { ...plan, measurements: plan.measurements.filter((item) => item.id !== id) }
}

export function copyArchitecture(plan: FloorPlan): FloorPlan {
  const copy = structuredClone(plan)
  copy.id = createId('pln')
  copy.measurements = []
  return copy
}

export function findOpeningHost(
  plan: FloorPlan,
  id: string,
): { kind: 'door' | 'window' | 'outlet' | 'switch'; wallId: string } | null {
  if (plan.doors.some((item) => item.id === id)) {
    const door = plan.doors.find((item) => item.id === id)
    return door ? { kind: 'door', wallId: door.wallId } : null
  }
  if (plan.windows.some((item) => item.id === id)) {
    const window = plan.windows.find((item) => item.id === id)
    return window ? { kind: 'window', wallId: window.wallId } : null
  }
  if (plan.outlets.some((item) => item.id === id)) {
    const outlet = plan.outlets.find((item) => item.id === id)
    return outlet ? { kind: 'outlet', wallId: outlet.wallId } : null
  }
  if (plan.switches.some((item) => item.id === id)) {
    const sw = plan.switches.find((item) => item.id === id)
    return sw ? { kind: 'switch', wallId: sw.wallId } : null
  }
  return null
}

export function clearedPlan(plan: FloorPlan): FloorPlan {
  return {
    ...emptyPlan(),
    showWallLengths: plan.showWallLengths,
    reference: plan.reference,
  }
}
