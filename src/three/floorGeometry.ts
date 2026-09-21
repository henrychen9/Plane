import { BufferGeometry, Shape, ShapeGeometry } from 'three'
import type { Point } from '../types/spatial'
import { inchesToSceneUnits } from './utils/units'

export type FloorBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  centerX: number
  centerZ: number
  width: number
  depth: number
  span: number
}

export type CameraFrame = {
  target: [number, number, number]
  position: [number, number, number]
  minDistance: number
  maxDistance: number
  far: number
  centerX: number
  centerZ: number
  width: number
  depth: number
  span: number
}

export function createFloorGeometry(polygon: Point[]): BufferGeometry | null {
  if (polygon.length < 3) return null
  const points = polygon.map((point) => ({
    x: inchesToSceneUnits(point.x),
    y: inchesToSceneUnits(point.y),
  }))
  if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null

  const shape = new Shape()
  shape.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i += 1) {
    shape.lineTo(points[i].x, points[i].y)
  }
  shape.closePath()

  const geometry = new ShapeGeometry(shape)
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    position.setXYZ(i, x, 0, y)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()

  const normal = geometry.getAttribute('normal')
  if (normal && normal.getY(0) < 0) {
    const index = geometry.getIndex()
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const b = index.getX(i + 1)
        index.setX(i + 1, index.getX(i + 2))
        index.setX(i + 2, b)
      }
      index.needsUpdate = true
    }
    geometry.computeVertexNormals()
  }

  return geometry
}

export function boundsOfPolygons(polygons: Point[][]): FloorBounds | null {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let any = false
  for (const polygon of polygons) {
    for (const point of polygon) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
      any = true
      const x = inchesToSceneUnits(point.x)
      const z = inchesToSceneUnits(point.y)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minZ = Math.min(minZ, z)
      maxZ = Math.max(maxZ, z)
    }
  }
  if (!any) return null
  const width = maxX - minX
  const depth = maxZ - minZ
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width,
    depth,
    span: Math.max(width, depth, 1),
  }
}

export function cameraFrameFromBounds(bounds: FloorBounds, wallHeight = 0): CameraFrame {
  const height = Math.max(wallHeight, 0)
  const distance = Math.max(bounds.span * 1.55, height * 2.4, 10)
  const targetY = height * 0.28
  return {
    target: [bounds.centerX, targetY, bounds.centerZ],
    position: [
      bounds.centerX + distance * 0.78,
      targetY + distance * 0.92 + height * 0.45,
      bounds.centerZ + distance * 0.78,
    ],
    minDistance: Math.max(bounds.span * 0.12, height * 0.4, 2),
    maxDistance: Math.max(bounds.span * 8, height * 12, 48),
    far: Math.max(240, bounds.span * 14, height * 20),
    centerX: bounds.centerX,
    centerZ: bounds.centerZ,
    width: bounds.width,
    depth: bounds.depth,
    span: bounds.span,
  }
}

export function polygonKey(polygon: Point[]): string {
  return polygon.map((point) => `${point.x},${point.y}`).join(';')
}

export function floorplanKey(polygons: Point[][]): string {
  return polygons.map(polygonKey).join('|')
}
