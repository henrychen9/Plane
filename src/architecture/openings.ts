import type { Door, FloorPlan, Point, Wall, WindowOpening } from '../types/spatial'
import { pointAlongWall, wallAngle, wallDirection, wallLength, wallNormal } from './geometry'

export type Interval = { start: number; end: number }

export function wallOpeningIntervals(plan: FloorPlan, wallId: string): Interval[] {
  const items: Interval[] = [
    ...plan.doors.filter((item) => item.wallId === wallId).map((item) => ({ start: item.offset, end: item.offset + item.width })),
    ...plan.windows.filter((item) => item.wallId === wallId).map((item) => ({ start: item.offset, end: item.offset + item.width })),
  ].sort((a, b) => a.start - b.start)

  const merged: Interval[] = []
  for (const item of items) {
    const last = merged[merged.length - 1]
    if (last && item.start <= last.end + 0.5) {
      last.end = Math.max(last.end, item.end)
    } else {
      merged.push({ ...item })
    }
  }
  return merged
}

export function wallSolidSegments(wall: Wall, plan: FloorPlan): { start: Point; end: Point }[] {
  const length = wallLength(wall)
  const gaps = wallOpeningIntervals(plan, wall.id)
  const solids: Interval[] = []
  let cursor = 0
  for (const gap of gaps) {
    if (gap.start > cursor + 0.4) solids.push({ start: cursor, end: gap.start })
    cursor = Math.max(cursor, gap.end)
  }
  if (cursor < length - 0.4) solids.push({ start: cursor, end: length })
  return solids.map((interval) => ({
    start: pointAlongWall(wall, interval.start),
    end: pointAlongWall(wall, interval.end),
  }))
}

/** Wall-local swing basis shared by 2D and 3D. +tangent is start→end, +normal is left of that. */
export function doorSwingBasis(door: Pick<Door, 'hingeSide' | 'swingDirection'>) {
  return {
    closedAlong: door.hingeSide === 'start' ? 1 : -1,
    swingSign: door.swingDirection === 'left' ? 1 : -1,
  }
}

export function doorGeometry(wall: Wall, door: Door) {
  const dir = wallDirection(wall)
  const normal = wallNormal(wall)
  const { closedAlong, swingSign } = doorSwingBasis(door)
  const gapStart = pointAlongWall(wall, door.offset)
  const gapEnd = pointAlongWall(wall, door.offset + door.width)
  const hinge = door.hingeSide === 'start' ? gapStart : gapEnd
  const closedLeaf = door.hingeSide === 'start' ? gapEnd : gapStart
  const slab = {
    x: hinge.x + normal.x * swingSign * door.width,
    y: hinge.y + normal.y * swingSign * door.width,
  }
  const arc: Point[] = []
  for (let i = 0; i <= 10; i += 1) {
    const t = (i / 10) * (Math.PI / 2)
    arc.push({
      x: hinge.x + (dir.x * closedAlong * Math.cos(t) + normal.x * swingSign * Math.sin(t)) * door.width,
      y: hinge.y + (dir.y * closedAlong * Math.cos(t) + normal.y * swingSign * Math.sin(t)) * door.width,
    })
  }
  return { gapStart, gapEnd, hinge, closedLeaf, slab, arc, angle: wallAngle(wall) }
}

export function windowGeometry(wall: Wall, window: WindowOpening) {
  const dir = wallDirection(wall)
  const normal = wallNormal(wall)
  const start = pointAlongWall(wall, window.offset)
  const end = pointAlongWall(wall, window.offset + window.width)
  const inset = Math.max(1.2, wall.thickness * 0.22)
  const offset = (p: Point, sign: number): Point => ({
    x: p.x + normal.x * sign * inset,
    y: p.y + normal.y * sign * inset,
  })
  return {
    start,
    end,
    inner: [offset(start, 1), offset(end, 1)] as [Point, Point],
    outer: [offset(start, -1), offset(end, -1)] as [Point, Point],
    dir,
  }
}
