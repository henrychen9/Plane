import { MIN_FURNITURE_SIZE, ROTATION_SNAP } from '../../editor/constants'
import { furnitureShapeOf, lShapeThickness } from '../../furniture/shapes'
import type { FurnitureItem } from '../../types/spatial'
import { rotatePoint, snapRotation } from '../../utils/geometry'
import { sceneUnitsToInches } from '../utils/units'

export type CornerId = 'nw' | 'ne' | 'sw' | 'se'

const CORNER_SIGNS: Record<CornerId, { sx: number; sz: number }> = {
  nw: { sx: -1, sz: -1 },
  ne: { sx: 1, sz: -1 },
  sw: { sx: -1, sz: 1 },
  se: { sx: 1, sz: 1 },
}

export const TRANSFORM_CORNERS: CornerId[] = ['nw', 'ne', 'sw', 'se']

/** Hard cap so a bad ray hit cannot create a 100,000-inch object. */
export const MAX_FURNITURE_SPAN = 960

export function minFurnitureSize(item: FurnitureItem): { width: number; depth: number } {
  const shape = furnitureShapeOf(item)
  if (shape === 'lShape') {
    const thickness = lShapeThickness(item)
    const min = Math.max(MIN_FURNITURE_SIZE, thickness + 6)
    return { width: min, depth: min }
  }
  return { width: MIN_FURNITURE_SIZE, depth: MIN_FURNITURE_SIZE }
}

export function floorHitToPlanInches(hitX: number, hitZ: number) {
  return { x: sceneUnitsToInches(hitX), y: sceneUnitsToInches(hitZ) }
}

/** Angle on the floor plane from +Z toward +X, in radians. Independent of camera zoom. */
export function worldAngleFromCenter(hitX: number, hitZ: number, centerX: number, centerZ: number) {
  return Math.atan2(hitX - centerX, hitZ - centerZ)
}

function wrapDelta(radians: number) {
  return Math.atan2(Math.sin(radians), Math.cos(radians))
}

export function rotationFromDrag(
  startRotation: number,
  startAngle: number,
  hitX: number,
  hitZ: number,
  centerX: number,
  centerZ: number,
  snap: boolean,
) {
  if (![hitX, hitZ, centerX, centerZ, startRotation, startAngle].every(Number.isFinite)) return null
  const current = worldAngleFromCenter(hitX, hitZ, centerX, centerZ)
  if (!Number.isFinite(current)) return null
  // Floor angle increases +Z → +X. Plan degrees are stored clockwise, and 3D yaw is negated,
  // so the signed delta is start - current for the handle to stay under the pointer.
  const degrees = startRotation + (wrapDelta(startAngle - current) * 180) / Math.PI
  if (!Number.isFinite(degrees)) return null
  if (snap) return snapRotation(degrees, ROTATION_SNAP)
  const normalized = ((degrees % 360) + 360) % 360
  return normalized === 360 ? 0 : normalized
}

function worldToLocal(item: FurnitureItem, worldX: number, worldY: number) {
  const cx = item.x + item.width / 2
  const cy = item.y + item.depth / 2
  const unrotated = rotatePoint(worldX, worldY, cx, cy, -(item.rotation || 0))
  return { x: unrotated.x - cx, y: unrotated.y - cy }
}

function localToWorld(item: FurnitureItem, localX: number, localY: number) {
  const cx = item.x + item.width / 2
  const cy = item.y + item.depth / 2
  return rotatePoint(cx + localX, cy + localY, cx, cy, item.rotation || 0)
}

function validSpan(value: number, min: number) {
  return Number.isFinite(value) && value >= min && value <= MAX_FURNITURE_SPAN
}

export function resizeFromCorner(
  start: FurnitureItem,
  corner: CornerId,
  worldX: number,
  worldY: number,
): Pick<FurnitureItem, 'x' | 'y' | 'width' | 'depth'> | null {
  if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return null
  const { sx, sz } = CORNER_SIGNS[corner]
  const min = minFurnitureSize(start)
  const local = worldToLocal(start, worldX, worldY)
  if (!Number.isFinite(local.x) || !Number.isFinite(local.y)) return null
  if (Math.hypot(local.x, local.y) > MAX_FURNITURE_SPAN * 1.5) return null

  const anchorX = -sx * (start.width / 2)
  const anchorY = -sz * (start.depth / 2)

  let dragX = sx > 0 ? Math.max(anchorX + min.width, local.x) : Math.min(anchorX - min.width, local.x)
  let dragY = sz > 0 ? Math.max(anchorY + min.depth, local.y) : Math.min(anchorY - min.depth, local.y)

  let width = Math.abs(dragX - anchorX)
  let depth = Math.abs(dragY - anchorY)

  if (furnitureShapeOf(start) === 'circle') {
    const diameter = Math.max(width, depth)
    width = diameter
    depth = diameter
    dragX = anchorX + sx * width
    dragY = anchorY + sz * depth
  }

  if (!validSpan(width, min.width) || !validSpan(depth, min.depth)) return null

  const center = localToWorld(start, (anchorX + dragX) / 2, (anchorY + dragY) / 2)
  const x = center.x - width / 2
  const y = center.y - depth / 2
  if (![x, y, width, depth].every(Number.isFinite)) return null

  return { x, y, width, depth }
}

export function cornerLocalOffset(corner: CornerId, width: number, depth: number, pad: number) {
  const { sx, sz } = CORNER_SIGNS[corner]
  return { x: sx * (width / 2 + pad), z: sz * (depth / 2 + pad) }
}
