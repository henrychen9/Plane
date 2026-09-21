import type { EditorSelection, FloorPlan, FurnitureItem, Point } from '../types/spatial'
import { pointHitsFurniture } from '../furniture/shapes'
import { doorGeometry, windowGeometry } from './openings'
import { distance, pointAlongWall, pointInPolygon, projectOnWall, wallNormal } from './geometry'

export type Hit = EditorSelection & { dist: number }

function markerHitDistance(point: Point, plan: FloorPlan, wallId: string, offset: number): number | null {
  const wall = plan.walls.find((item) => item.id === wallId)
  if (!wall) return null
  const pos = pointAlongWall(wall, offset)
  const normal = wallNormal(wall)
  const visual = {
    x: pos.x + normal.x * (wall.thickness * 0.5 + 4),
    y: pos.y + normal.y * (wall.thickness * 0.5 + 4),
  }
  return Math.min(distance(point, pos), distance(point, visual))
}

export function hitsAt(
  point: Point,
  plan: FloorPlan,
  furniture: FurnitureItem[],
  threshold: number,
  layers: { architecture: boolean; furniture: boolean; electrical: boolean; measurements: boolean },
): Hit[] {
  const hits: Hit[] = []

  if (layers.electrical) {
    for (const outlet of plan.outlets) {
      const dist = markerHitDistance(point, plan, outlet.wallId, outlet.offset)
      if (dist != null && dist <= Math.max(threshold, 12)) hits.push({ kind: 'outlet', id: outlet.id, dist })
    }
    for (const item of plan.switches) {
      const dist = markerHitDistance(point, plan, item.wallId, item.offset)
      if (dist != null && dist <= Math.max(threshold, 12)) hits.push({ kind: 'switch', id: item.id, dist })
    }
  }

  if (layers.furniture) {
    for (const item of furniture) {
      if (pointHitsFurniture(point, item)) {
        hits.push({ kind: 'furniture', id: item.id, dist: 0 })
      }
    }
  }

  if (layers.architecture) {
    for (const door of plan.doors) {
      const wall = plan.walls.find((item) => item.id === door.wallId)
      if (!wall) continue
      const geo = doorGeometry(wall, door)
      const toGap = projectOnWall(point, { start: geo.gapStart, end: geo.gapEnd }).distance
      const toSlab = projectOnWall(point, { start: geo.hinge, end: geo.slab }).distance
      const toArc = Math.min(...geo.arc.map((arcPoint) => distance(point, arcPoint)))
      const dist = Math.min(toGap, toSlab, toArc)
      if (dist <= Math.max(threshold, wall.thickness, 10)) hits.push({ kind: 'door', id: door.id, dist })
    }
    for (const window of plan.windows) {
      const wall = plan.walls.find((item) => item.id === window.wallId)
      if (!wall) continue
      const geo = windowGeometry(wall, window)
      const dist = projectOnWall(point, { start: geo.start, end: geo.end }).distance
      if (dist <= Math.max(threshold, wall.thickness, 10)) hits.push({ kind: 'window', id: window.id, dist })
    }
    for (const fixture of plan.fixtures) {
      if (
        point.x >= fixture.x &&
        point.x <= fixture.x + fixture.width &&
        point.y >= fixture.y &&
        point.y <= fixture.y + fixture.depth
      ) {
        hits.push({ kind: 'fixture', id: fixture.id, dist: 0 })
      }
    }
    for (const wall of plan.walls) {
      const hit = projectOnWall(point, wall)
      if (hit.distance <= Math.max(threshold, wall.thickness * 0.7)) {
        hits.push({ kind: 'wall', id: wall.id, dist: hit.distance })
      }
    }
    for (const room of plan.rooms) {
      if (pointInPolygon(point, room.polygon)) hits.push({ kind: 'room', id: room.id, dist: 24 })
    }
  }

  if (layers.measurements) {
    for (const measure of plan.measurements) {
      const mid = {
        x: (measure.start.x + measure.end.x) / 2,
        y: (measure.start.y + measure.end.y) / 2,
      }
      if (distance(point, mid) <= threshold + 6) hits.push({ kind: 'measurement', id: measure.id, dist: distance(point, mid) })
    }
  }

  const rank: Record<Hit['kind'], number> = {
    outlet: 0,
    switch: 0,
    door: 0,
    window: 0,
    furniture: 1,
    fixture: 2,
    wall: 3,
    measurement: 4,
    room: 5,
  }
  return hits.sort((a, b) => rank[a.kind] - rank[b.kind] || a.dist - b.dist)
}

export function pickTop(
  point: Point,
  plan: FloorPlan,
  furniture: FurnitureItem[],
  threshold: number,
  layers: { architecture: boolean; furniture: boolean; electrical: boolean; measurements: boolean },
  current?: { kind: string; id: string } | null,
): Hit | null {
  const hits = hitsAt(point, plan, furniture, threshold, layers)
  if (hits.length === 0) return null
  if (!current) return hits[0]
  const index = hits.findIndex((hit) => hit.kind === current.kind && hit.id === current.id)
  if (index === -1) return hits[0]
  return hits[(index + 1) % hits.length]
}

export function pickMountedAt(point: Point, plan: FloorPlan, threshold: number): Hit | null {
  const hits = hitsAt(point, plan, [], Math.max(threshold, 10), {
    architecture: true,
    furniture: false,
    electrical: true,
    measurements: false,
  })
  return hits.find((hit) => hit.kind === 'door' || hit.kind === 'window' || hit.kind === 'outlet' || hit.kind === 'switch') ?? null
}
