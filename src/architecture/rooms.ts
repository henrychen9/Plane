import type { DetectedRoom, Point, Wall } from '../types/spatial'
import { createId } from '../utils/id'
import {
  distance,
  parseVertexKey,
  polygonArea,
  polygonCentroid,
  polygonPerimeter,
  shoelace,
  vertexKey,
  wallLength,
} from './geometry'

type DirEdge = {
  wallId: string
  from: string
  to: string
  angle: number
  used: boolean
}

export function detectRooms(walls: Wall[], previous: DetectedRoom[] = []): DetectedRoom[] {
  const usable = walls.filter((wall) => wallLength(wall) > 1)
  if (usable.length < 3) return []

  const vertices = new Map<string, Point>()
  const outgoing = new Map<string, DirEdge[]>()

  const keyOf = (p: Point) => {
    const key = vertexKey(p)
    if (!vertices.has(key)) vertices.set(key, parseVertexKey(key))
    return key
  }

  const add = (from: string, to: string, wallId: string) => {
    const a = vertices.get(from)
    const b = vertices.get(to)
    if (!a || !b) return
    const edge: DirEdge = {
      wallId,
      from,
      to,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      used: false,
    }
    const list = outgoing.get(from) ?? []
    list.push(edge)
    outgoing.set(from, list)
  }

  for (const wall of usable) {
    const a = keyOf(wall.start)
    const b = keyOf(wall.end)
    if (a === b) continue
    add(a, b, wall.id)
    add(b, a, wall.id)
  }

  for (const list of outgoing.values()) {
    list.sort((left, right) => left.angle - right.angle)
  }

  const faces: DirEdge[][] = []
  for (const list of outgoing.values()) {
    for (const start of list) {
      if (start.used) continue
      const face: DirEdge[] = []
      let current = start
      let guard = 0
      while (guard < 400) {
        guard += 1
        if (current.used && face.length > 0) break
        current.used = true
        face.push(current)
        const outs = outgoing.get(current.to)
        if (!outs || outs.length === 0) break
        const back = outs.findIndex((edge) => edge.to === current.from && edge.wallId === current.wallId)
        const index = back === -1 ? 0 : (back + 1) % outs.length
        const next = outs[index]
        if (!next) break
        if (next.from === start.from && next.to === start.to && next.wallId === start.wallId) {
          break
        }
        current = next
      }
      if (face.length >= 3) faces.push(face)
    }
  }

  const rooms: DetectedRoom[] = []
  for (const face of faces) {
    const polygon = face.map((edge) => vertices.get(edge.from)).filter((p): p is Point => Boolean(p))
    if (polygon.length < 3) continue
    const signed = shoelace(polygon)
    if (signed <= 40) continue
    const wallIds = [...new Set(face.map((edge) => edge.wallId))]
    rooms.push({
      id: createId('rm'),
      name: 'Room',
      wallIds,
      polygon,
      area: polygonArea(polygon),
      perimeter: polygonPerimeter(polygon),
    })
  }

  rooms.sort((a, b) => b.area - a.area)
  return assignRoomNames(rooms, previous)
}

function assignRoomNames(rooms: DetectedRoom[], previous: DetectedRoom[]): DetectedRoom[] {
  const used = new Set<string>()
  return rooms.map((room, index) => {
    const center = polygonCentroid(room.polygon)
    let best: DetectedRoom | undefined
    let bestDist = 36
    for (const old of previous) {
      if (used.has(old.id)) continue
      const other = polygonCentroid(old.polygon)
      const dist = distance(center, other)
      if (dist < bestDist) {
        best = old
        bestDist = dist
      }
    }
    if (best) {
      used.add(best.id)
      return { ...room, id: best.id, name: best.name, floorMaterial: best.floorMaterial }
    }
    return { ...room, name: index === 0 ? 'Room' : `Room ${index + 1}` }
  })
}
