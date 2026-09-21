import { DEFAULT_WALL_HEIGHT, WALL_THICKNESS } from '../../editor/constants'
import type { Point, Vertex, Wall } from '../../types/spatial'
import { inchesToSceneUnits } from '../utils/units'

const MIN_WALL_LENGTH_INCHES = 0.5

export type WallTransform = {
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number, number]
}

export function resolveWallEndpoints(wall: Wall, vertices: Vertex[]): { start: Point; end: Point } | null {
  const byId = new Map(vertices.map((vertex) => [vertex.id, vertex]))
  const start = byId.get(wall.startVertexId) ?? wall.start
  const end = byId.get(wall.endVertexId) ?? wall.end
  if (!start || !end) return null
  if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) {
    return null
  }
  return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } }
}

export function wallThicknessInches(wall: Wall): number {
  return wall.thickness > 0 ? wall.thickness : WALL_THICKNESS
}

export function wallHeightInches(wall: Wall): number {
  return wall.height > 0 ? wall.height : DEFAULT_WALL_HEIGHT
}

export function wallTransform(wall: Wall, vertices: Vertex[]): WallTransform | null {
  const ends = resolveWallEndpoints(wall, vertices)
  if (!ends) return null
  const dx = ends.end.x - ends.start.x
  const dz = ends.end.y - ends.start.y
  const length = Math.hypot(dx, dz)
  if (!Number.isFinite(length) || length < MIN_WALL_LENGTH_INCHES) return null

  const thickness = wallThicknessInches(wall)
  const height = wallHeightInches(wall)
  const overlap = thickness
  const drawLength = length + overlap

  return {
    position: [
      inchesToSceneUnits((ends.start.x + ends.end.x) / 2),
      inchesToSceneUnits(height) / 2,
      inchesToSceneUnits((ends.start.y + ends.end.y) / 2),
    ],
    rotation: [0, -Math.atan2(dz, dx), 0],
    size: [
      inchesToSceneUnits(drawLength),
      inchesToSceneUnits(height),
      inchesToSceneUnits(thickness),
    ],
  }
}

export function maxWallHeightScene(walls: Wall[]): number {
  if (walls.length === 0) return 0
  return inchesToSceneUnits(Math.max(...walls.map(wallHeightInches)))
}

export function wallEndpointPoints(walls: Wall[], vertices: Vertex[]): Point[] {
  const points: Point[] = []
  for (const wall of walls) {
    const ends = resolveWallEndpoints(wall, vertices)
    if (!ends) continue
    points.push(ends.start, ends.end)
  }
  return points
}

export function wallSnapshot(wall: Wall, vertices: Vertex[]): string {
  const ends = resolveWallEndpoints(wall, vertices)
  return [
    wall.id,
    wall.startVertexId,
    wall.endVertexId,
    wall.thickness,
    wall.height,
    ends?.start.x,
    ends?.start.y,
    ends?.end.x,
    ends?.end.y,
  ].join(':')
}

export function wallKey(wall: Wall): string {
  return [
    wall.id,
    wall.startVertexId,
    wall.endVertexId,
    wall.start.x,
    wall.start.y,
    wall.end.x,
    wall.end.y,
    wall.thickness,
    wall.height,
  ].join(':')
}
