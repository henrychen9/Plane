import type { Point } from '../types/spatial'

export type Segment = { start: Point; end: Point }

export function point(x: number, y: number): Point {
  return { x, y }
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function samePoint(a: Point, b: Point, eps = 0.85): boolean {
  return distance(a, b) <= eps
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function wallLength(wall: Segment): number {
  return distance(wall.start, wall.end)
}

export function wallAngle(wall: Segment): number {
  return (Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x) * 180) / Math.PI
}

export function wallDirection(wall: Segment): Point {
  const len = wallLength(wall) || 1
  return { x: (wall.end.x - wall.start.x) / len, y: (wall.end.y - wall.start.y) / len }
}

export function wallNormal(wall: Segment): Point {
  const dir = wallDirection(wall)
  return { x: -dir.y, y: dir.x }
}

export function pointAlongWall(wall: Segment, offset: number): Point {
  const dir = wallDirection(wall)
  return { x: wall.start.x + dir.x * offset, y: wall.start.y + dir.y * offset }
}

export function projectOnWall(point: Point, wall: Segment): { offset: number; point: Point; distance: number } {
  const len = wallLength(wall)
  if (len < 0.001) {
    return { offset: 0, point: { ...wall.start }, distance: distance(point, wall.start) }
  }
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const t = Math.max(0, Math.min(1, ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / (len * len)))
  const projected = { x: wall.start.x + dx * t, y: wall.start.y + dy * t }
  return { offset: t * len, point: projected, distance: distance(point, projected) }
}

export function clampOffsetForOpening(offset: number, width: number, wall: Segment, inset = 2): number {
  const len = wallLength(wall)
  const max = Math.max(inset, len - width - inset)
  return Math.max(inset, Math.min(max, offset))
}

export function distanceToSegment(point: Point, a: Point, b: Point): number {
  return projectOnWall(point, { start: a, end: b }).distance
}

export function shoelace(polygon: Point[]): number {
  if (polygon.length < 3) return 0
  let sum = 0
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

export function polygonArea(polygon: Point[]): number {
  return Math.abs(shoelace(polygon))
}

export function polygonPerimeter(polygon: Point[]): number {
  if (polygon.length < 2) return 0
  let sum = 0
  for (let i = 0; i < polygon.length; i += 1) {
    sum += distance(polygon[i], polygon[(i + 1) % polygon.length])
  }
  return sum
}

export function polygonCentroid(polygon: Point[]): Point {
  if (polygon.length === 0) return { x: 0, y: 0 }
  const area = shoelace(polygon)
  if (Math.abs(area) < 0.001) {
    const x = polygon.reduce((s, p) => s + p.x, 0) / polygon.length
    const y = polygon.reduce((s, p) => s + p.y, 0) / polygon.length
    return { x, y }
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const cross = a.x * b.y - b.x * a.y
    cx += (a.x + b.x) * cross
    cy += (a.y + b.y) * cross
  }
  return { x: cx / (6 * area), y: cy / (6 * area) }
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]
    const b = polygon[j]
    const intersect =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || Number.EPSILON) + a.x
    if (intersect) inside = !inside
  }
  return inside
}

export function vertexKey(p: Point, precision = 0.5): string {
  const x = Math.round(p.x / precision) * precision
  const y = Math.round(p.y / precision) * precision
  return `${x},${y}`
}

export function parseVertexKey(key: string): Point {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}

export function normalizeAngle(degrees: number): number {
  const value = ((degrees % 360) + 360) % 360
  return value > 180 ? value - 360 : value
}

export function constrainAngle(degrees: number, step = 45): number {
  return Math.round(degrees / step) * step
}

export function lineIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const dax = a2.x - a1.x
  const day = a2.y - a1.y
  const dbx = b2.x - b1.x
  const dby = b2.y - b1.y
  const den = dax * dby - day * dbx
  if (Math.abs(den) < 1e-9) return null
  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / den
  return { x: a1.x + t * dax, y: a1.y + t * day }
}

export function aabbIntersectsAabb(
  a: { x: number; y: number; width: number; depth: number },
  b: { x: number; y: number; width: number; depth: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y
}

export function normalizeRect(a: Point, b: Point): { x: number; y: number; width: number; depth: number } {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, width: Math.abs(b.x - a.x), depth: Math.abs(b.y - a.y) }
}

export function lineSegmentsIntersect(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
  epsilon = 0.2,
): boolean {
  const den = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x)
  if (Math.abs(den) < 1e-8) return false
  const t = ((b1.x - a1.x) * (b2.y - b1.y) - (b1.y - a1.y) * (b2.x - b1.x)) / den
  const u = ((b1.x - a1.x) * (a2.y - a1.y) - (b1.y - a1.y) * (a2.x - a1.x)) / den
  return t > epsilon && t < 1 - epsilon && u > epsilon && u < 1 - epsilon
}

export function aabbIntersectsSegment(
  box: { x: number; y: number; width: number; depth: number },
  a: Point,
  b: Point,
): boolean {
  const pad = 1.5
  const minX = box.x - pad
  const minY = box.y - pad
  const maxX = box.x + box.width + pad
  const maxY = box.y + box.depth + pad
  const inside = (p: Point) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
  if (inside(a) || inside(b)) return true
  const corners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ]
  for (let i = 0; i < 4; i += 1) {
    if (lineSegmentsIntersect(a, b, corners[i], corners[(i + 1) % 4], 0)) return true
  }
  return false
}
