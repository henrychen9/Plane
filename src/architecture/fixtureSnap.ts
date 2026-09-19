import type { Fixture, FloorPlan } from '../types/spatial'
import { GRID_INCHES } from '../editor/constants'
import { furnitureCenter } from '../utils/geometry'
import { midpoint, projectOnWall, wallAngle, wallNormal } from './geometry'
import { nearestWall } from './plan'

export function snapFixture(
  fixture: Fixture,
  plan: FloorPlan,
  options: { enabled: boolean; grid: boolean; threshold: number },
): Fixture {
  if (!options.enabled) return fixture
  let next = { ...fixture }

  if (options.grid) {
    next.x = Math.round(next.x / GRID_INCHES) * GRID_INCHES
    next.y = Math.round(next.y / GRID_INCHES) * GRID_INCHES
  }

  const center = furnitureCenter(next)
  const wallHit = nearestWall(plan, center, Math.max(options.threshold, next.type === 'kitchen-counter' ? 18 : 10))
  if (wallHit && (next.type === 'kitchen-counter' || next.type === 'radiator' || next.type === 'built-in-cabinet')) {
    const wall = wallHit.wall
    const normal = wallNormal(wall)
    const mid = midpoint(wall.start, wall.end)
    const toCenter = { x: center.x - mid.x, y: center.y - mid.y }
    const sign = toCenter.x * normal.x + toCenter.y * normal.y >= 0 ? 1 : -1
    const projected = projectOnWall(center, wall).point
    const inset = wall.thickness / 2 + next.depth / 2
    const placed = {
      x: projected.x + normal.x * sign * inset,
      y: projected.y + normal.y * sign * inset,
    }
    next = {
      ...next,
      rotation: wallAngle(wall) + (sign < 0 ? 180 : 0),
      x: placed.x - next.width / 2,
      y: placed.y - next.depth / 2,
    }
  }

  for (const other of plan.fixtures) {
    if (other.id === next.id) continue
    if (Math.abs(next.x - other.x) < options.threshold) next.x = other.x
    if (Math.abs(next.y - other.y) < options.threshold) next.y = other.y
    if (Math.abs(next.x + next.width - (other.x + other.width)) < options.threshold) {
      next.x = other.x + other.width - next.width
    }
    if (Math.abs(next.y + next.depth - (other.y + other.depth)) < options.threshold) {
      next.y = other.y + other.depth - next.depth
    }
  }

  return next
}
