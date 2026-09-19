import { getCatalogItem } from '../catalog/furniture'
import type { FurnitureItem, FurnitureShape, Point } from '../types/spatial'
import { furnitureCenter, rotatePoint } from '../utils/geometry'
import { pointInPolygon } from '../architecture/geometry'

export function furnitureShapeOf(item: Pick<FurnitureItem, 'type' | 'shape'>): FurnitureShape {
  return item.shape ?? getCatalogItem(item.type)?.shape ?? 'rectangle'
}

export function lShapeThickness(item: Pick<FurnitureItem, 'width' | 'depth' | 'shapeData'>): number {
  const fallback = Math.min(item.width, item.depth) * 0.4
  return Math.min(item.width, item.depth, item.shapeData?.thickness ?? Math.max(12, fallback))
}

export function lShapePolygon(item: Pick<FurnitureItem, 'width' | 'depth' | 'shapeData'>): Point[] {
  const w = item.width
  const d = item.depth
  const t = lShapeThickness(item)
  const side = item.shapeData?.returnSide ?? 'left'
  if (side === 'right') {
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: d },
      { x: w - t, y: d },
      { x: w - t, y: t },
      { x: 0, y: t },
    ]
  }
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: t },
    { x: t, y: t },
    { x: t, y: d },
    { x: 0, y: d },
  ]
}

export function lShapePoints(item: Pick<FurnitureItem, 'width' | 'depth' | 'shapeData'>): number[] {
  return lShapePolygon(item).flatMap((point) => [point.x, point.y])
}

export function worldToFurnitureLocal(
  point: Point,
  item: Pick<FurnitureItem, 'x' | 'y' | 'width' | 'depth' | 'rotation'>,
): Point {
  const center = furnitureCenter(item)
  const unrotated = rotatePoint(point.x, point.y, center.x, center.y, -(item.rotation || 0))
  return { x: unrotated.x - item.x, y: unrotated.y - item.y }
}

export function pointHitsFurniture(point: Point, item: FurnitureItem): boolean {
  const local = worldToFurnitureLocal(point, item)
  const shape = furnitureShapeOf(item)
  if (shape === 'circle') {
    const r = item.width / 2
    return Math.hypot(local.x - item.width / 2, local.y - item.depth / 2) <= r
  }
  if (shape === 'oval') {
    const rx = item.width / 2 || 1
    const ry = item.depth / 2 || 1
    const dx = (local.x - item.width / 2) / rx
    const dy = (local.y - item.depth / 2) / ry
    return dx * dx + dy * dy <= 1
  }
  if (shape === 'lShape') {
    return pointInPolygon(local, lShapePolygon(item))
  }
  return local.x >= 0 && local.x <= item.width && local.y >= 0 && local.y <= item.depth
}
