import type { FurnitureItem, Rect, Room } from '../types/spatial'

export function clone<T>(value: T): T {
  return structuredClone(value)
}

export function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  degrees: number,
): { x: number; y: number } {
  const r = (degrees * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const dx = px - cx
  const dy = py - cy
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
}

export function furnitureCenter(item: Pick<FurnitureItem, 'x' | 'y' | 'width' | 'depth'>): {
  x: number
  y: number
} {
  return { x: item.x + item.width / 2, y: item.y + item.depth / 2 }
}

export function furnitureAABB(item: FurnitureItem): Rect {
  if (!item.rotation || item.rotation % 360 === 0) {
    return { x: item.x, y: item.y, width: item.width, depth: item.depth }
  }
  const { x: cx, y: cy } = furnitureCenter(item)
  const corners = [
    rotatePoint(item.x, item.y, cx, cy, item.rotation),
    rotatePoint(item.x + item.width, item.y, cx, cy, item.rotation),
    rotatePoint(item.x + item.width, item.y + item.depth, cx, cy, item.rotation),
    rotatePoint(item.x, item.y + item.depth, cx, cy, item.rotation),
  ]
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { x: minX, y: minY, width: maxX - minX, depth: maxY - minY }
}

export function clampFurnitureToRoom(
  item: FurnitureItem,
  room: Room,
  allowOutside: boolean,
): FurnitureItem {
  if (allowOutside) return item
  const aabb = furnitureAABB(item)
  let dx = 0
  let dy = 0
  if (aabb.width >= room.width) {
    dx = room.width / 2 - (aabb.x + aabb.width / 2)
  } else {
    if (aabb.x < 0) dx = -aabb.x
    if (aabb.x + aabb.width > room.width) dx = room.width - (aabb.x + aabb.width)
  }
  if (aabb.depth >= room.depth) {
    dy = room.depth / 2 - (aabb.y + aabb.depth / 2)
  } else {
    if (aabb.y < 0) dy = -aabb.y
    if (aabb.y + aabb.depth > room.depth) dy = room.depth - (aabb.y + aabb.depth)
  }
  if (dx === 0 && dy === 0) return item
  return { ...item, x: item.x + dx, y: item.y + dy }
}

export function snapRotation(degrees: number, increment = 15): number {
  const normalized = ((degrees % 360) + 360) % 360
  const snapped = Math.round(normalized / increment) * increment
  return snapped === 360 ? 0 : snapped
}

export function almostEqual(a: number, b: number, epsilon = 0.01): boolean {
  return Math.abs(a - b) < epsilon
}
