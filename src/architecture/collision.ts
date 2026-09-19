import type { CollisionKind, FloorPlan, FurnitureItem, Point } from '../types/spatial'
import { furnitureAABB, furnitureCenter } from '../utils/geometry'
import { furnitureShapeOf } from '../furniture/shapes'
import { aabbIntersectsSegment, distanceToSegment, pointInPolygon, wallLength, wallNormal, pointAlongWall } from './geometry'

export function furnitureCollisions(
  item: FurnitureItem,
  plan: FloorPlan,
): CollisionKind[] {
  const hits: CollisionKind[] = []
  const box = furnitureAABB(item)
  const shape = furnitureShapeOf(item)
  const center = furnitureCenter(item)

  for (const wall of plan.walls) {
    const pad = wall.thickness / 2
    if (shape === 'circle') {
      const radius = item.width / 2 + pad
      if (distanceToSegment(center, wall.start, wall.end) <= radius) hits.push('wall')
      continue
    }
    const expanded = {
      x: box.x - pad,
      y: box.y - pad,
      width: box.width + pad * 2,
      depth: box.depth + pad * 2,
    }
    if (aabbIntersectsSegment(expanded, wall.start, wall.end)) hits.push('wall')
  }

  if (plan.rooms.length > 0) {
    const inside = plan.rooms.some((room) => pointInPolygon(center, room.polygon))
    if (!inside) hits.push('outside')
  }

  for (const fixture of plan.fixtures) {
    if (fixture.type !== 'column') continue
    const overlap = !(
      box.x + box.width < fixture.x ||
      fixture.x + fixture.width < box.x ||
      box.y + box.depth < fixture.y ||
      fixture.y + fixture.depth < box.y
    )
    if (overlap) hits.push('column')
  }

  for (const door of plan.doors) {
    if (door.type !== 'hinged') continue
    const wall = plan.walls.find((itemWall) => itemWall.id === door.wallId)
    if (!wall) continue
    const samples = doorSwingSamples(wall, door.offset, door.width, door.hingeSide, door.swingDirection)
    const blocked =
      shape === 'circle'
        ? samples.some((point) => Math.hypot(point.x - center.x, point.y - center.y) <= item.width / 2)
        : samples.some((point) => pointInBox(point, box))
    if (blocked) hits.push('door')
  }

  return [...new Set(hits)]
}

function pointInBox(point: Point, box: { x: number; y: number; width: number; depth: number }): boolean {
  return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.depth
}

export function doorSwingSamples(
  wall: { start: Point; end: Point; id: string; thickness: number; height: number; type: 'exterior' | 'interior' | 'partition'; locked: boolean },
  offset: number,
  width: number,
  hingeSide: 'start' | 'end',
  swing: 'left' | 'right',
): Point[] {
  const hingeOffset = hingeSide === 'start' ? offset : offset + width
  const hinge = pointAlongWall(wall, hingeOffset)
  const normal = wallNormal(wall)
  const sign = swing === 'left' ? 1 : -1
  const points: Point[] = []
  for (let i = 0; i <= 6; i += 1) {
    const t = (i / 6) * (Math.PI / 2)
    const along = hingeSide === 'start' ? 1 : -1
    const dir = {
      x: ((wall.end.x - wall.start.x) / (wallLength(wall) || 1)) * along,
      y: ((wall.end.y - wall.start.y) / (wallLength(wall) || 1)) * along,
    }
    points.push({
      x: hinge.x + (dir.x * Math.cos(t) + normal.x * sign * Math.sin(t)) * width,
      y: hinge.y + (dir.y * Math.cos(t) + normal.y * sign * Math.sin(t)) * width,
    })
  }
  return points
}
