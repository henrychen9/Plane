import type { FloorPlan, Point, Vertex, Wall } from '../types/spatial'
import { createId } from '../utils/id'
import { clampOffsetForOpening, distance, wallLength } from './geometry'

export const VERTEX_MERGE_TOLERANCE = 0.5

export function vertexPoint(plan: FloorPlan, id: string): Point | null {
  const vertex = (plan.vertices ?? []).find((item) => item.id === id)
  return vertex ? { x: vertex.x, y: vertex.y } : null
}

export function vertexDegree(plan: FloorPlan, vertexId: string): number {
  return plan.walls.filter((wall) => wall.startVertexId === vertexId || wall.endVertexId === vertexId).length
}

export function wallHasSharedEndpoints(plan: FloorPlan, wall: Wall): boolean {
  return vertexDegree(plan, wall.startVertexId) > 1 || vertexDegree(plan, wall.endVertexId) > 1
}

export function nearestVertex(
  plan: FloorPlan,
  point: Point,
  maxDist: number,
  excludeId?: string,
): Vertex | null {
  let best: Vertex | null = null
  let bestDist = maxDist
  for (const vertex of plan.vertices ?? []) {
    if (vertex.id === excludeId) continue
    const dist = distance(point, vertex)
    if (dist < bestDist) {
      best = vertex
      bestDist = dist
    }
  }
  return best
}

export function syncWallGeometry(plan: FloorPlan): FloorPlan {
  const byId = new Map((plan.vertices ?? []).map((vertex) => [vertex.id, vertex]))
  const walls = plan.walls.map((wall) => {
    const start = byId.get(wall.startVertexId)
    const end = byId.get(wall.endVertexId)
    if (!start || !end) return wall
    return {
      ...wall,
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
    }
  })
  return { ...plan, walls }
}

export function pruneUnusedVertices(plan: FloorPlan): FloorPlan {
  const used = new Set<string>()
  for (const wall of plan.walls) {
    used.add(wall.startVertexId)
    used.add(wall.endVertexId)
  }
  return {
    ...plan,
    vertices: (plan.vertices ?? []).filter((vertex) => used.has(vertex.id)),
  }
}

export function clampMountedItems(plan: FloorPlan): FloorPlan {
  const byId = new Map(plan.walls.map((wall) => [wall.id, wall]))
  const clampItem = <T extends { wallId: string; offset: number; width?: number }>(item: T): T => {
    const wall = byId.get(item.wallId)
    if (!wall) return item
    const width = item.width ?? 0
    const offset =
      width > 0
        ? clampOffsetForOpening(item.offset, width, wall)
        : Math.max(2, Math.min(Math.max(2, wallLength(wall) - 2), item.offset))
    return offset === item.offset ? item : { ...item, offset }
  }
  return {
    ...plan,
    doors: plan.doors.map(clampItem),
    windows: plan.windows.map(clampItem),
    outlets: plan.outlets.map(clampItem),
    switches: plan.switches.map(clampItem),
  }
}

export function refreshPlanGeometry(plan: FloorPlan): FloorPlan {
  return clampMountedItems(syncWallGeometry(plan))
}

export function getOrCreateVertex(
  plan: FloorPlan,
  point: Point,
  tolerance = VERTEX_MERGE_TOLERANCE,
): { plan: FloorPlan; id: string } {
  const existing = nearestVertex(plan, point, tolerance)
  if (existing) return { plan, id: existing.id }
  const vertex: Vertex = { id: createId('vtx'), x: point.x, y: point.y }
  return { plan: { ...plan, vertices: [...(plan.vertices ?? []), vertex] }, id: vertex.id }
}

export function setVertexPosition(plan: FloorPlan, vertexId: string, point: Point): FloorPlan {
  const vertices = (plan.vertices ?? []).map((vertex) =>
    vertex.id === vertexId ? { ...vertex, x: point.x, y: point.y } : vertex,
  )
  return refreshPlanGeometry({ ...plan, vertices })
}

export function translateVertices(plan: FloorPlan, ids: string[], dx: number, dy: number): FloorPlan {
  const moving = new Set(ids)
  const vertices = (plan.vertices ?? []).map((vertex) =>
    moving.has(vertex.id) ? { ...vertex, x: vertex.x + dx, y: vertex.y + dy } : vertex,
  )
  return refreshPlanGeometry({ ...plan, vertices })
}

export function mergeVertices(plan: FloorPlan, keepId: string, dropId: string): FloorPlan {
  if (keepId === dropId) return plan
  const keep = (plan.vertices ?? []).find((vertex) => vertex.id === keepId)
  const drop = (plan.vertices ?? []).find((vertex) => vertex.id === dropId)
  if (!keep || !drop) return plan

  const remapped = plan.walls.map((wall) => ({
    ...wall,
    startVertexId: wall.startVertexId === dropId ? keepId : wall.startVertexId,
    endVertexId: wall.endVertexId === dropId ? keepId : wall.endVertexId,
  }))
  const removedIds = new Set(
    remapped.filter((wall) => wall.startVertexId === wall.endVertexId).map((wall) => wall.id),
  )
  const walls = remapped.filter((wall) => !removedIds.has(wall.id))
  const vertices = (plan.vertices ?? []).filter((vertex) => vertex.id !== dropId)

  return pruneUnusedVertices(
    refreshPlanGeometry({
      ...plan,
      vertices,
      walls,
      doors: plan.doors.filter((item) => !removedIds.has(item.wallId)),
      windows: plan.windows.filter((item) => !removedIds.has(item.wallId)),
      outlets: plan.outlets.filter((item) => !removedIds.has(item.wallId)),
      switches: plan.switches.filter((item) => !removedIds.has(item.wallId)),
    }),
  )
}

export function mergeVertexIfNearby(plan: FloorPlan, vertexId: string, threshold: number): FloorPlan {
  const vertex = (plan.vertices ?? []).find((item) => item.id === vertexId)
  if (!vertex) return plan
  const other = nearestVertex(plan, vertex, threshold, vertexId)
  if (!other) return plan
  return mergeVertices(plan, other.id, vertexId)
}

export function mergeCoincidentVertices(
  plan: FloorPlan,
  tolerance = VERTEX_MERGE_TOLERANCE,
): FloorPlan {
  let next = plan
  let guard = 0
  while (guard < 400) {
    guard += 1
    const verts = next.vertices ?? []
    let merged = false
    for (let i = 0; i < verts.length; i += 1) {
      for (let j = i + 1; j < verts.length; j += 1) {
        if (distance(verts[i], verts[j]) <= tolerance) {
          next = mergeVertices(next, verts[i].id, verts[j].id)
          merged = true
          break
        }
      }
      if (merged) break
    }
    if (!merged) break
  }
  return next
}

export function migrateVertices(plan: FloorPlan): FloorPlan {
  const existing = plan.vertices ?? []
  const hasGraph =
    existing.length > 0 && plan.walls.every((wall) => wall.startVertexId && wall.endVertexId)

  if (hasGraph) {
    return mergeCoincidentVertices(pruneUnusedVertices(refreshPlanGeometry(plan)))
  }

  const vertices: Vertex[] = []
  const findOrAdd = (point: Point) => {
    const found = vertices.find((vertex) => distance(vertex, point) <= VERTEX_MERGE_TOLERANCE)
    if (found) return found.id
    const vertex: Vertex = { id: createId('vtx'), x: point.x, y: point.y }
    vertices.push(vertex)
    return vertex.id
  }

  const walls = plan.walls.map((wall) => {
    const start = wall.start ?? { x: 0, y: 0 }
    const end = wall.end ?? { x: 0, y: 0 }
    return {
      ...wall,
      startVertexId: findOrAdd({ x: start.x, y: start.y }),
      endVertexId: findOrAdd({ x: end.x, y: end.y }),
    }
  })

  return pruneUnusedVertices(refreshPlanGeometry({ ...plan, vertices, walls }))
}
