import { GRID_INCHES } from '../editor/constants'
import type { AlignmentGuide, FloorPlan, Point, Wall } from '../types/spatial'
import { constrainAngle, distance, projectOnWall } from './geometry'
import { nearestEndpoint, nearestWall } from './plan'
import { nearestVertex } from './vertices'

export function snapDrawPoint(
  raw: Point,
  last: Point | null,
  plan: FloorPlan,
  options: { enabled: boolean; grid: boolean; threshold: number; shift: boolean },
): { point: Point; guides: AlignmentGuide[]; snappedToWall?: Wall } {
  if (!options.enabled) return { point: raw, guides: [] }

  let point = { ...raw }
  const guides: AlignmentGuide[] = []

  if (options.grid) {
    point = {
      x: Math.round(point.x / GRID_INCHES) * GRID_INCHES,
      y: Math.round(point.y / GRID_INCHES) * GRID_INCHES,
    }
  }

  const end = nearestEndpoint(plan, point, options.threshold)
  if (end) return { point: { ...end }, guides }

  const onWall = nearestWall(plan, point, options.threshold)
  if (onWall) {
    const projected = projectOnWall(point, onWall.wall)
    return { point: projected.point, guides, snappedToWall: onWall.wall }
  }

  if (last) {
    const dx = point.x - last.x
    const dy = point.y - last.y
    if (options.shift) {
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI
      const snapped = constrainAngle(angle, 45)
      const rad = (snapped * Math.PI) / 180
      const len = distance(last, point)
      point = { x: last.x + Math.cos(rad) * len, y: last.y + Math.sin(rad) * len }
      if (snapped % 180 === 0) guides.push({ axis: 'y', position: last.y })
      if (Math.abs(snapped % 180) === 90) guides.push({ axis: 'x', position: last.x })
    } else {
      if (Math.abs(dx) < options.threshold) {
        point.x = last.x
        guides.push({ axis: 'x', position: last.x })
      }
      if (Math.abs(dy) < options.threshold) {
        point.y = last.y
        guides.push({ axis: 'y', position: last.y })
      }
    }
  }

  for (const wall of plan.walls) {
    for (const vertex of [wall.start, wall.end]) {
      if (Math.abs(point.x - vertex.x) < options.threshold) {
        point.x = vertex.x
        guides.push({ axis: 'x', position: vertex.x })
      }
      if (Math.abs(point.y - vertex.y) < options.threshold) {
        point.y = vertex.y
        guides.push({ axis: 'y', position: vertex.y })
      }
    }
  }

  return { point, guides }
}

export function snapMeasurePoint(
  raw: Point,
  plan: FloorPlan,
  furniture: { x: number; y: number; width: number; depth: number }[],
  options: { enabled: boolean; threshold: number },
): Point {
  if (!options.enabled) return raw
  const end = nearestEndpoint(plan, raw, options.threshold)
  if (end) return { ...end }
  const onWall = nearestWall(plan, raw, options.threshold)
  if (onWall) return projectOnWall(raw, onWall.wall).point
  for (const item of furniture) {
    const corners = [
      { x: item.x, y: item.y },
      { x: item.x + item.width, y: item.y },
      { x: item.x + item.width, y: item.y + item.depth },
      { x: item.x, y: item.y + item.depth },
    ]
    for (const corner of corners) {
      if (distance(raw, corner) <= options.threshold) return corner
    }
  }
  return raw
}

export function snapVertexPoint(
  raw: Point,
  origin: Point,
  plan: FloorPlan,
  options: { enabled: boolean; grid: boolean; threshold: number; shift: boolean; excludeVertexId: string },
): { point: Point; snapVertexId: string | null } {
  if (!options.enabled) return { point: raw, snapVertexId: null }

  let point = { ...raw }
  if (options.grid) {
    point = {
      x: Math.round(point.x / GRID_INCHES) * GRID_INCHES,
      y: Math.round(point.y / GRID_INCHES) * GRID_INCHES,
    }
  }

  if (options.shift) {
    const angle = (Math.atan2(point.y - origin.y, point.x - origin.x) * 180) / Math.PI
    const snapped = constrainAngle(angle, 45)
    const rad = (snapped * Math.PI) / 180
    const len = distance(origin, point)
    point = { x: origin.x + Math.cos(rad) * len, y: origin.y + Math.sin(rad) * len }
  }

  const other = nearestVertex(plan, point, options.threshold, options.excludeVertexId)
  if (other) return { point: { x: other.x, y: other.y }, snapVertexId: other.id }
  return { point, snapVertexId: null }
}
