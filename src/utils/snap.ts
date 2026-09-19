import { GRID_INCHES } from '../editor/constants'
import type { AlignmentGuide, FurnitureItem, Room } from '../types/spatial'
import { furnitureAABB, furnitureCenter } from './geometry'

type SnapResult = {
  x: number
  y: number
  guides: AlignmentGuide[]
}

type EdgeSet = {
  starts: number[]
  centers: number[]
  ends: number[]
}

function collectEdges(items: { x: number; size: number }[]): EdgeSet {
  return {
    starts: items.map((i) => i.x),
    centers: items.map((i) => i.x + i.size / 2),
    ends: items.map((i) => i.x + i.size),
  }
}

function closestDelta(value: number, targets: number[], threshold: number): number | null {
  let best: number | null = null
  let bestAbs = threshold
  for (const target of targets) {
    const delta = target - value
    const abs = Math.abs(delta)
    if (abs <= bestAbs) {
      bestAbs = abs
      best = delta
    }
  }
  return best
}

export function snapFurniture(
  item: FurnitureItem,
  others: FurnitureItem[],
  room: Room,
  options: { enabled: boolean; grid: boolean; threshold: number },
): SnapResult {
  if (!options.enabled) {
    return { x: item.x, y: item.y, guides: [] }
  }

  let next = { ...item }
  const guides: AlignmentGuide[] = []

  if (options.grid) {
    const aabb = furnitureAABB(next)
    const snappedX = Math.round(aabb.x / GRID_INCHES) * GRID_INCHES
    const snappedY = Math.round(aabb.y / GRID_INCHES) * GRID_INCHES
    next.x += snappedX - aabb.x
    next.y += snappedY - aabb.y
  }

  const aabb = furnitureAABB(next)
  const otherBoxes = others.map((other) => furnitureAABB(other))

  const xTargets = collectEdges([
    { x: 0, size: room.width },
    ...otherBoxes.map((box) => ({ x: box.x, size: box.width })),
  ])
  const yTargets = collectEdges([
    { x: 0, size: room.depth },
    ...otherBoxes.map((box) => ({ x: box.y, size: box.depth })),
  ])

  const xCandidates: { delta: number; guide: number }[] = []
  const yCandidates: { delta: number; guide: number }[] = []

  const pushAxis = (
    list: { delta: number; guide: number }[],
    value: number,
    targets: number[],
    extra?: number[],
  ) => {
    const all = extra ? [...targets, ...extra] : targets
    const delta = closestDelta(value, all, options.threshold)
    if (delta !== null) list.push({ delta, guide: value + delta })
  }

  pushAxis(xCandidates, aabb.x, xTargets.starts, xTargets.ends)
  pushAxis(xCandidates, aabb.x + aabb.width / 2, xTargets.centers, [room.width / 2])
  pushAxis(xCandidates, aabb.x + aabb.width, xTargets.ends, xTargets.starts)

  pushAxis(yCandidates, aabb.y, yTargets.starts, yTargets.ends)
  pushAxis(yCandidates, aabb.y + aabb.depth / 2, yTargets.centers, [room.depth / 2])
  pushAxis(yCandidates, aabb.y + aabb.depth, yTargets.ends, yTargets.starts)

  const pick = (list: { delta: number; guide: number }[]) => {
    if (list.length === 0) return null
    return list.reduce((best, current) =>
      Math.abs(current.delta) < Math.abs(best.delta) ? current : best,
    )
  }

  const xSnap = pick(xCandidates)
  const ySnap = pick(yCandidates)

  if (xSnap) {
    next.x += xSnap.delta
    guides.push({ axis: 'x', position: xSnap.guide })
  }
  if (ySnap) {
    next.y += ySnap.delta
    guides.push({ axis: 'y', position: ySnap.guide })
  }

  const center = furnitureCenter(next)
  if (Math.abs(center.x - room.width / 2) < options.threshold) {
    next.x += room.width / 2 - center.x
    if (!guides.some((g) => g.axis === 'x')) {
      guides.push({ axis: 'x', position: room.width / 2 })
    }
  }
  if (Math.abs(center.y - room.depth / 2) < options.threshold) {
    next.y += room.depth / 2 - center.y
    if (!guides.some((g) => g.axis === 'y')) {
      guides.push({ axis: 'y', position: room.depth / 2 })
    }
  }

  return { x: next.x, y: next.y, guides }
}

export function snapThresholdInches(zoom: number, pixelsPerInch: number): number {
  const screenPx = 7
  const inches = screenPx / (zoom * pixelsPerInch)
  return Math.min(8, Math.max(2.5, inches))
}
