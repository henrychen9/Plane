import type { EditorSelection, FloorPlan, FurnitureItem, Point } from '../types/spatial'
import { pointHitsFurniture } from '../furniture/shapes'
import { doorGeometry } from './openings'
import { distance, pointAlongWall, pointInPolygon, projectOnWall } from './geometry'

export type Hit = EditorSelection & { dist: number }

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
      const wall = plan.walls.find((item) => item.id === outlet.wallId)
      if (!wall) continue
      const pos = pointAlongWall(wall, outlet.offset)
      const dist = distance(point, pos)
      if (dist <= Math.max(threshold, 8)) hits.push({ kind: 'outlet', id: outlet.id, dist })
    }
    for (const item of plan.switches) {
      const wall = plan.walls.find((entry) => entry.id === item.wallId)
      if (!wall) continue
      const pos = pointAlongWall(wall, item.offset)
      const dist = distance(point, pos)
      if (dist <= Math.max(threshold, 8)) hits.push({ kind: 'switch', id: item.id, dist })
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
      if (dist <= Math.max(threshold, wall.thickness, 8)) hits.push({ kind: 'door', id: door.id, dist })
    }
    for (const window of plan.windows) {
      const wall = plan.walls.find((item) => item.id === window.wallId)
      if (!wall) continue
      const mid = pointAlongWall(wall, window.offset + window.width / 2)
      const dist = distance(point, mid)
      if (dist <= Math.max(threshold, window.width / 2)) hits.push({ kind: 'window', id: window.id, dist })
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
    furniture: 1,
    door: 2,
    window: 2,
    fixture: 3,
    wall: 4,
    measurement: 5,
    room: 6,
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
