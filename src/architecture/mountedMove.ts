import type { EditorSelection, FloorPlan, Point, Wall } from '../types/spatial'
import { clampOffsetForOpening, clampOffsetOnWall, projectOnWall } from './geometry'

/** Door/window `offset` is the leading edge from wall start, not the center. */
export function openingOffsetFromPointer(point: Point, wall: Wall, width: number): number {
  const hit = projectOnWall(point, wall)
  return clampOffsetForOpening(hit.offset - width / 2, width, wall)
}

/** Outlet/switch `offset` is the attachment point along the wall. */
export function markerOffsetFromPointer(point: Point, wall: Wall): number {
  const hit = projectOnWall(point, wall)
  return clampOffsetOnWall(hit.offset, wall)
}

export function arrowAlongWall(dx: number, dy: number): number {
  return dx !== 0 ? dx : dy
}

function wallOf(plan: FloorPlan, wallId: string): Wall | undefined {
  return plan.walls.find((item) => item.id === wallId)
}

export function nudgeMountedPlan(plan: FloorPlan, selections: EditorSelection[], alongDelta: number): FloorPlan {
  if (alongDelta === 0) return plan
  let doors = plan.doors
  let windows = plan.windows
  let outlets = plan.outlets
  let switches = plan.switches

  for (const selection of selections) {
    if (selection.kind === 'door') {
      const door = doors.find((item) => item.id === selection.id)
      const wall = door ? wallOf(plan, door.wallId) : undefined
      if (!door || !wall) continue
      const offset = clampOffsetForOpening(door.offset + alongDelta, door.width, wall)
      doors = doors.map((item) => (item.id === door.id ? { ...item, offset } : item))
    } else if (selection.kind === 'window') {
      const window = windows.find((item) => item.id === selection.id)
      const wall = window ? wallOf(plan, window.wallId) : undefined
      if (!window || !wall) continue
      const offset = clampOffsetForOpening(window.offset + alongDelta, window.width, wall)
      windows = windows.map((item) => (item.id === window.id ? { ...item, offset } : item))
    } else if (selection.kind === 'outlet') {
      const outlet = outlets.find((item) => item.id === selection.id)
      const wall = outlet ? wallOf(plan, outlet.wallId) : undefined
      if (!outlet || !wall) continue
      const offset = clampOffsetOnWall(outlet.offset + alongDelta, wall)
      outlets = outlets.map((item) => (item.id === outlet.id ? { ...item, offset } : item))
    } else if (selection.kind === 'switch') {
      const item = switches.find((entry) => entry.id === selection.id)
      const wall = item ? wallOf(plan, item.wallId) : undefined
      if (!item || !wall) continue
      const offset = clampOffsetOnWall(item.offset + alongDelta, wall)
      switches = switches.map((entry) => (entry.id === item.id ? { ...entry, offset } : entry))
    }
  }

  return { ...plan, doors, windows, outlets, switches }
}
