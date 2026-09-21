import type { Door, Point, Vertex, Wall, WindowOpening } from '../../types/spatial'
import { doorSwingBasis } from '../../architecture/openings'
import { inchesToSceneUnits } from '../utils/units'
import { resolveWallEndpoints, wallHeightInches, wallThicknessInches } from '../walls/wallGeometry'

export const DEFAULT_DOOR_HEIGHT = 80
export const DEFAULT_SILL_HEIGHT = 36
export const DEFAULT_WINDOW_HEIGHT = 48
export const DOOR_OPEN_RADIANS = (40 * Math.PI) / 180
export const DOOR_SLAB_THICKNESS = 1.5
export const WINDOW_FRAME_INCHES = 1.75

const MIN_SPAN = 0.4
const MERGE_EPS = 0.2

export type Vec3 = [number, number, number]

export type WallFrame = {
  start: Point
  end: Point
  length: number
  thickness: number
  height: number
  rotationY: number
  origin: Vec3
}

export type OpeningRect = {
  id: string
  kind: 'door' | 'window'
  x0: number
  x1: number
  y0: number
  y1: number
}

export type WallSolid = {
  x0: number
  x1: number
  y0: number
  y1: number
  extendStart: boolean
  extendEnd: boolean
}

export type BoxPose = {
  position: Vec3
  size: Vec3
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function uniqueSorted(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const out: number[] = []
  for (const value of sorted) {
    if (!Number.isFinite(value)) continue
    if (out.length === 0 || value - out[out.length - 1] > MERGE_EPS) out.push(value)
  }
  return out
}

function mergeYGaps(gaps: { y0: number; y1: number }[]): { y0: number; y1: number }[] {
  const sorted = [...gaps].sort((a, b) => a.y0 - b.y0)
  const merged: { y0: number; y1: number }[] = []
  for (const gap of sorted) {
    const last = merged[merged.length - 1]
    if (last && gap.y0 <= last.y1 + MERGE_EPS) {
      last.y1 = Math.max(last.y1, gap.y1)
    } else {
      merged.push({ ...gap })
    }
  }
  return merged
}

export function wallFrame(wall: Wall, vertices: Vertex[]): WallFrame | null {
  const ends = resolveWallEndpoints(wall, vertices)
  if (!ends) return null
  const dx = ends.end.x - ends.start.x
  const dz = ends.end.y - ends.start.y
  const length = Math.hypot(dx, dz)
  if (!Number.isFinite(length) || length < MIN_SPAN) return null
  const height = wallHeightInches(wall)
  const thickness = wallThicknessInches(wall)
  return {
    start: ends.start,
    end: ends.end,
    length,
    thickness,
    height,
    rotationY: -Math.atan2(dz, dx),
    origin: [
      inchesToSceneUnits((ends.start.x + ends.end.x) / 2),
      0,
      inchesToSceneUnits((ends.start.y + ends.end.y) / 2),
    ],
  }
}

export function doorOpeningRect(door: Door, length: number, wallHeight: number): OpeningRect | null {
  const width = Math.max(door.width, 0)
  const x0 = clamp(door.offset, 0, length)
  const x1 = clamp(door.offset + width, 0, length)
  if (x1 - x0 < MIN_SPAN) return null
  const top = clamp(DEFAULT_DOOR_HEIGHT, MIN_SPAN, wallHeight)
  return { id: door.id, kind: 'door', x0, x1, y0: 0, y1: top }
}

export function windowOpeningRect(window: WindowOpening, length: number, wallHeight: number): OpeningRect | null {
  const width = Math.max(window.width, 0)
  const x0 = clamp(window.offset, 0, length)
  const x1 = clamp(window.offset + width, 0, length)
  if (x1 - x0 < MIN_SPAN) return null
  const sill = Number.isFinite(window.sillHeight) ? window.sillHeight : DEFAULT_SILL_HEIGHT
  const height = window.height > 0 ? window.height : DEFAULT_WINDOW_HEIGHT
  const y0 = clamp(sill, 0, wallHeight)
  const y1 = clamp(y0 + height, y0, wallHeight)
  if (y1 - y0 < MIN_SPAN) return null
  return { id: window.id, kind: 'window', x0, x1, y0, y1 }
}

export function openingRectsForWall(
  frame: WallFrame,
  doors: Door[],
  windows: WindowOpening[],
): OpeningRect[] {
  const rects: OpeningRect[] = []
  for (const door of doors) {
    const rect = doorOpeningRect(door, frame.length, frame.height)
    if (rect) rects.push(rect)
  }
  for (const window of windows) {
    const rect = windowOpeningRect(window, frame.length, frame.height)
    if (rect) rects.push(rect)
  }
  return rects
}

export function wallSolids(frame: WallFrame, openings: OpeningRect[]): WallSolid[] {
  if (openings.length === 0) {
    return [{ x0: 0, x1: frame.length, y0: 0, y1: frame.height, extendStart: true, extendEnd: true }]
  }

  const xs = uniqueSorted([0, frame.length, ...openings.flatMap((item) => [item.x0, item.x1])])
  const solids: WallSolid[] = []

  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i]
    const x1 = xs[i + 1]
    if (x1 - x0 < MIN_SPAN) continue
    const midX = (x0 + x1) / 2
    const covering = openings.filter((item) => item.x0 < midX && item.x1 > midX)
    const gaps = mergeYGaps(covering.map((item) => ({ y0: item.y0, y1: item.y1 })))
    const extendStart = x0 <= MERGE_EPS
    const extendEnd = x1 >= frame.length - MERGE_EPS

    let cursor = 0
    for (const gap of gaps) {
      if (gap.y0 > cursor + MIN_SPAN) {
        solids.push({ x0, x1, y0: cursor, y1: gap.y0, extendStart, extendEnd })
      }
      cursor = Math.max(cursor, gap.y1)
    }
    if (frame.height - cursor > MIN_SPAN) {
      solids.push({ x0, x1, y0: cursor, y1: frame.height, extendStart, extendEnd })
    }
  }

  return solids
}

export function solidBox(frame: WallFrame, solid: WallSolid): BoxPose | null {
  const overlap = frame.thickness / 2
  const start = solid.x0 - (solid.extendStart ? overlap : 0)
  const end = solid.x1 + (solid.extendEnd ? overlap : 0)
  const width = end - start
  const height = solid.y1 - solid.y0
  if (width < MIN_SPAN || height < MIN_SPAN) return null
  return {
    position: [
      inchesToSceneUnits((start + end) / 2 - frame.length / 2),
      inchesToSceneUnits((solid.y0 + solid.y1) / 2),
      0,
    ],
    size: [inchesToSceneUnits(width), inchesToSceneUnits(height), inchesToSceneUnits(frame.thickness)],
  }
}

export function alongToLocalX(frame: WallFrame, along: number): number {
  return inchesToSceneUnits(along - frame.length / 2)
}

export function doorSlabPose(
  frame: WallFrame,
  door: Door,
  opening: OpeningRect,
): {
  hinge: Vec3
  rotationY: number
  size: Vec3
  centerOffset: Vec3
} {
  const height = opening.y1 - opening.y0
  const width = opening.x1 - opening.x0
  const thickness = DOOR_SLAB_THICKNESS

  if (door.type !== 'hinged') {
    const slabWidth = Math.max(width * 0.62, MIN_SPAN)
    return {
      hinge: [alongToLocalX(frame, opening.x0 + slabWidth / 2), inchesToSceneUnits(height / 2), 0],
      rotationY: 0,
      size: [inchesToSceneUnits(slabWidth), inchesToSceneUnits(height), inchesToSceneUnits(thickness)],
      centerOffset: [0, 0, 0],
    }
  }

  const { closedAlong, swingSign } = doorSwingBasis(door)
  const open = DOOR_OPEN_RADIANS
  // Match 2D arc(t): tangent * closedAlong * cos(t) + normal * swingSign * sin(t).
  // Wall group local +X is tangent, local +Z is the 2D wall normal.
  const openX = closedAlong * Math.cos(open)
  const openZ = swingSign * Math.sin(open)
  const rotationY = Math.atan2(-openZ, openX)
  const hingeAlong = door.hingeSide === 'end' ? opening.x1 : opening.x0

  return {
    hinge: [alongToLocalX(frame, hingeAlong), inchesToSceneUnits(height / 2), 0],
    rotationY,
    size: [inchesToSceneUnits(width), inchesToSceneUnits(height), inchesToSceneUnits(thickness)],
    centerOffset: [inchesToSceneUnits(width / 2), 0, 0],
  }
}

export type WindowParts = {
  frames: BoxPose[]
  glass: BoxPose
}

export function windowParts(frame: WallFrame, opening: OpeningRect): WindowParts | null {
  const width = opening.x1 - opening.x0
  const height = opening.y1 - opening.y0
  if (width < MIN_SPAN || height < MIN_SPAN) return null
  const trim = Math.min(WINDOW_FRAME_INCHES, width * 0.22, height * 0.22)
  const depth = frame.thickness
  const cx = (opening.x0 + opening.x1) / 2
  const cy = (opening.y0 + opening.y1) / 2
  const innerW = Math.max(width - trim * 2, MIN_SPAN)
  const innerH = Math.max(height - trim * 2, MIN_SPAN)

  const box = (along: number, y: number, w: number, h: number): BoxPose => ({
    position: [alongToLocalX(frame, along), inchesToSceneUnits(y), 0],
    size: [inchesToSceneUnits(w), inchesToSceneUnits(h), inchesToSceneUnits(depth)],
  })

  return {
    frames: [
      box(cx, opening.y0 + trim / 2, width, trim),
      box(cx, opening.y1 - trim / 2, width, trim),
      box(opening.x0 + trim / 2, cy, trim, innerH),
      box(opening.x1 - trim / 2, cy, trim, innerH),
    ],
    glass: {
      position: [alongToLocalX(frame, cx), inchesToSceneUnits(cy), 0],
      size: [inchesToSceneUnits(innerW), inchesToSceneUnits(innerH), inchesToSceneUnits(0.35)],
    },
  }
}

export function wallOpeningsSnapshot(wall: Wall, vertices: Vertex[], doors: Door[], windows: WindowOpening[]): string {
  const ends = resolveWallEndpoints(wall, vertices)
  return [
    wall.id,
    wall.thickness,
    wall.height,
    ends?.start.x,
    ends?.start.y,
    ends?.end.x,
    ends?.end.y,
    ...doors.map((door) => [door.id, door.offset, door.width, door.type, door.hingeSide, door.swingDirection].join(',')),
    ...windows.map((item) => [item.id, item.offset, item.width, item.height, item.sillHeight].join(',')),
  ].join('|')
}
