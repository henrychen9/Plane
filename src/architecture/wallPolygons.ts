import type { FloorPlan, Point, Wall } from '../types/spatial'
import { distance, lineIntersection, wallDirection, wallLength, wallNormal } from './geometry'

const MITER_LIMIT = 4

function offsetLine(wall: Wall, side: number) {
  const normal = wallNormal(wall)
  const half = wall.thickness / 2
  const ox = normal.x * side * half
  const oy = normal.y * side * half
  return {
    a: { x: wall.start.x + ox, y: wall.start.y + oy },
    b: { x: wall.end.x + ox, y: wall.end.y + oy },
  }
}

function capPoint(wall: Wall, vertex: Point, side: number): Point {
  const normal = wallNormal(wall)
  const half = wall.thickness / 2
  return { x: vertex.x + normal.x * side * half, y: vertex.y + normal.y * side * half }
}

function wallsAtVertex(plan: FloorPlan, vertexId: string, exceptId: string): Wall[] {
  return plan.walls.filter(
    (wall) => wall.id !== exceptId && (wall.startVertexId === vertexId || wall.endVertexId === vertexId),
  )
}

function outgoingDir(wall: Wall, vertexId: string): Point {
  const dir = wallDirection(wall)
  return wall.startVertexId === vertexId ? dir : { x: -dir.x, y: -dir.y }
}

function angleBetween(a: Point, b: Point): number {
  const la = Math.hypot(a.x, a.y)
  const lb = Math.hypot(b.x, b.y)
  if (la < 1e-8 || lb < 1e-8) return 0
  const dot = Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (la * lb)))
  return (Math.acos(dot) * 180) / Math.PI
}

function finitePoint(point: Point | undefined): point is Point {
  return Boolean(point) && Number.isFinite(point!.x) && Number.isFinite(point!.y)
}

function signedDist(wall: Wall, point: Point): number {
  const normal = wallNormal(wall)
  return (point.x - wall.start.x) * normal.x + (point.y - wall.start.y) * normal.y
}

function findCollinearPair(walls: Wall[], vertexId: string): [Wall, Wall] | null {
  for (let i = 0; i < walls.length; i += 1) {
    for (let j = i + 1; j < walls.length; j += 1) {
      if (angleBetween(outgoingDir(walls[i], vertexId), outgoingDir(walls[j], vertexId)) > 165) {
        return [walls[i], walls[j]]
      }
    }
  }
  return null
}

function inSmallerWedge(vertex: Point, dirA: Point, dirB: Point, point: Point): boolean {
  const vector = { x: point.x - vertex.x, y: point.y - vertex.y }
  if (Math.hypot(vector.x, vector.y) < 1e-8) return true
  const angAB = Math.atan2(dirA.x * dirB.y - dirA.y * dirB.x, dirA.x * dirB.x + dirA.y * dirB.y)
  const angAV = Math.atan2(dirA.x * vector.y - dirA.y * vector.x, dirA.x * vector.x + dirA.y * vector.y)
  if (angAB >= 0) return angAV >= -1e-6 && angAV <= angAB + 1e-6
  return angAV <= 1e-6 && angAV >= angAB - 1e-6
}

export function joinPoint(plan: FloorPlan, wall: Wall, which: 'start' | 'end', side: 1 | -1): Point {
  const vertex = which === 'start' ? wall.start : wall.end
  const vertexId = which === 'start' ? wall.startVertexId : wall.endVertexId
  const cap = finitePoint(vertex) ? capPoint(wall, vertex, side) : { x: 0, y: 0 }
  if (!finitePoint(vertex) || wallLength(wall) < 0.2) return cap
  const half = wall.thickness / 2
  const others = wallsAtVertex(plan, vertexId, wall.id).filter(
    (item) => finitePoint(item.start) && finitePoint(item.end) && wallLength(item) >= 0.2,
  )
  const selfOffset = offsetLine(wall, side)
  if (others.length === 0) return cap

  const selfDir = outgoingDir(wall, vertexId)
  const collinear = others.filter(
    (other) => angleBetween(selfDir, outgoingDir(other, vertexId)) > 165,
  )
  const throughPair = collinear.length === 0 ? findCollinearPair(others, vertexId) : null

  if (throughPair) {
    const through = throughPair[0]
    const interior = {
      x: vertex.x + selfDir.x * Math.max(2, wall.thickness),
      y: vertex.y + selfDir.y * Math.max(2, wall.thickness),
    }
    const face = Math.sign(signedDist(through, interior)) || 1
    const hit = lineIntersection(
      selfOffset.a,
      selfOffset.b,
      offsetLine(through, face).a,
      offsetLine(through, face).b,
    )
    if (hit && distance(hit, vertex) <= half * MITER_LIMIT) return hit
    return cap
  }

  if (collinear.length > 0) return cap

  const neighbor = others.length === 1 ? others[0] : null
  if (neighbor && !inSmallerWedge(vertex, selfDir, outgoingDir(neighbor, vertexId), cap)) {
    return cap
  }

  let best: Point | null = null
  let bestScore = Infinity
  for (const other of others) {
    for (const otherSide of [side, -side] as const) {
      const hit = lineIntersection(
        selfOffset.a,
        selfOffset.b,
        offsetLine(other, otherSide).a,
        offsetLine(other, otherSide).b,
      )
      if (!hit) continue
      const fromVertex = distance(hit, vertex)
      if (fromVertex > half * MITER_LIMIT) continue
      const selfErr = Math.abs(signedDist(wall, hit) - side * half)
      const otherErr = Math.abs(Math.abs(signedDist(other, hit)) - other.thickness / 2)
      const score = selfErr + otherErr + fromVertex * 0.02 + (otherSide === side ? 0 : 0.35)
      if (score < bestScore) {
        bestScore = score
        best = hit
      }
    }
  }
  return best ?? cap
}

const OUTER_ARC_STEPS = 12

function outerCap(wall: Wall, vertex: Point, dirA: Point, dirB: Point): Point {
  const plus = capPoint(wall, vertex, 1)
  return inSmallerWedge(vertex, dirA, dirB, plus) ? capPoint(wall, vertex, -1) : plus
}

function outerPiePoints(vertex: Point, capA: Point, capB: Point, radius: number): number[] {
  const start = Math.atan2(capA.y - vertex.y, capA.x - vertex.x)
  const end = Math.atan2(capB.y - vertex.y, capB.x - vertex.x)
  let delta = end - start
  while (delta <= -Math.PI) delta += 2 * Math.PI
  while (delta > Math.PI) delta -= 2 * Math.PI
  const points = [vertex.x, vertex.y]
  for (let i = 0; i <= OUTER_ARC_STEPS; i += 1) {
    const angle = start + (delta * i) / OUTER_ARC_STEPS
    points.push(vertex.x + Math.cos(angle) * radius, vertex.y + Math.sin(angle) * radius)
  }
  return points
}

export function cornerHubs(
  plan: FloorPlan,
  selectedWallIds: string[] = [],
): { id: string; points: number[]; selected: boolean }[] {
  const selected = new Set(selectedWallIds)
  const hubs: { id: string; points: number[]; selected: boolean }[] = []
  for (const vertex of plan.vertices ?? []) {
    const walls = plan.walls.filter(
      (wall) =>
        (wall.startVertexId === vertex.id || wall.endVertexId === vertex.id) &&
        finitePoint(wall.start) &&
        finitePoint(wall.end) &&
        wallLength(wall) >= 0.2,
    )
    if (walls.length !== 2) continue
    if (findCollinearPair(walls, vertex.id)) continue
    const dirA = outgoingDir(walls[0], vertex.id)
    const dirB = outgoingDir(walls[1], vertex.id)
    const turn = angleBetween(dirA, dirB)
    if (turn > 165 || turn < 8) continue
    const radius = Math.min(walls[0].thickness, walls[1].thickness) / 2
    if (radius < 0.4) continue
    const capA = outerCap(walls[0], vertex, dirA, dirB)
    const capB = outerCap(walls[1], vertex, dirA, dirB)
    hubs.push({
      id: vertex.id,
      points: outerPiePoints(vertex, capA, capB, radius),
      selected: walls.some((wall) => selected.has(wall.id)),
    })
  }
  return hubs
}

function bentJoinVertex(plan: FloorPlan, wall: Wall, which: 'start' | 'end'): Point | null {
  const vertex = which === 'start' ? wall.start : wall.end
  const vertexId = which === 'start' ? wall.startVertexId : wall.endVertexId
  if (!finitePoint(vertex)) return null
  const others = wallsAtVertex(plan, vertexId, wall.id).filter(
    (item) => finitePoint(item.start) && finitePoint(item.end) && wallLength(item) >= 0.2,
  )
  if (others.length !== 1) return null
  const turn = angleBetween(outgoingDir(wall, vertexId), outgoingDir(others[0], vertexId))
  if (turn > 165 || turn < 8) return null
  return vertex
}

function pushPoint(points: number[], point: Point) {
  points.push(point.x, point.y)
}

export function wallPolygon(plan: FloorPlan, wall: Wall): number[] {
  if (!finitePoint(wall.start) || !finitePoint(wall.end) || wallLength(wall) < 0.2) return []
  const points: number[] = []
  pushPoint(points, joinPoint(plan, wall, 'start', 1))
  pushPoint(points, joinPoint(plan, wall, 'end', 1))
  const endBend = bentJoinVertex(plan, wall, 'end')
  if (endBend) pushPoint(points, endBend)
  pushPoint(points, joinPoint(plan, wall, 'end', -1))
  pushPoint(points, joinPoint(plan, wall, 'start', -1))
  const startBend = bentJoinVertex(plan, wall, 'start')
  if (startBend) pushPoint(points, startBend)
  if (points.some((value) => !Number.isFinite(value))) return []
  return points
}
