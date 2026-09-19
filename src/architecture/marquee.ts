import type { EditorSelection, FloorPlan, FurnitureItem, Point } from '../types/spatial'
import { furnitureAABB } from '../utils/geometry'
import { aabbIntersectsAabb, aabbIntersectsSegment, normalizeRect, pointAlongWall } from './geometry'
import { doorGeometry } from './openings'

function pointInBox(point: Point, box: { x: number; y: number; width: number; depth: number }, pad = 0): boolean {
  return (
    point.x >= box.x - pad &&
    point.x <= box.x + box.width + pad &&
    point.y >= box.y - pad &&
    point.y <= box.y + box.depth + pad
  )
}

export function hitsInRect(
  a: Point,
  b: Point,
  plan: FloorPlan,
  furniture: FurnitureItem[],
  layers: { architecture: boolean; furniture: boolean; electrical: boolean },
): EditorSelection[] {
  const box = normalizeRect(a, b)
  if (box.width < 0.4 && box.depth < 0.4) return []
  const hits: EditorSelection[] = []

  if (layers.furniture) {
    for (const item of furniture) {
      if (aabbIntersectsAabb(box, furnitureAABB(item))) hits.push({ kind: 'furniture', id: item.id })
    }
  }

  if (layers.architecture) {
    for (const fixture of plan.fixtures) {
      const bounds = { x: fixture.x, y: fixture.y, width: fixture.width, depth: fixture.depth }
      if (aabbIntersectsAabb(box, bounds)) hits.push({ kind: 'fixture', id: fixture.id })
    }
    for (const door of plan.doors) {
      const wall = plan.walls.find((item) => item.id === door.wallId)
      if (!wall) continue
      const geo = doorGeometry(wall, door)
      if (
        aabbIntersectsSegment(box, geo.gapStart, geo.gapEnd) ||
        aabbIntersectsSegment(box, geo.hinge, geo.slab)
      ) {
        hits.push({ kind: 'door', id: door.id })
      }
    }
    for (const window of plan.windows) {
      const wall = plan.walls.find((item) => item.id === window.wallId)
      if (!wall) continue
      if (
        aabbIntersectsSegment(
          box,
          pointAlongWall(wall, window.offset),
          pointAlongWall(wall, window.offset + window.width),
        )
      ) {
        hits.push({ kind: 'window', id: window.id })
      }
    }
    for (const wall of plan.walls) {
      const pad = wall.thickness / 2
      const expanded = {
        x: box.x - pad,
        y: box.y - pad,
        width: box.width + pad * 2,
        depth: box.depth + pad * 2,
      }
      if (aabbIntersectsSegment(expanded, wall.start, wall.end)) hits.push({ kind: 'wall', id: wall.id })
    }
  }

  if (layers.electrical) {
    for (const outlet of plan.outlets) {
      const wall = plan.walls.find((item) => item.id === outlet.wallId)
      if (!wall) continue
      if (pointInBox(pointAlongWall(wall, outlet.offset), box, 6)) hits.push({ kind: 'outlet', id: outlet.id })
    }
    for (const item of plan.switches) {
      const wall = plan.walls.find((entry) => entry.id === item.wallId)
      if (!wall) continue
      if (pointInBox(pointAlongWall(wall, item.offset), box, 6)) hits.push({ kind: 'switch', id: item.id })
    }
  }

  return hits
}
