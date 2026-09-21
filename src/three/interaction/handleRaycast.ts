import type { Intersection, Object3D } from 'three'

export const TRANSFORM_HANDLE_KEY = 'transformHandle'
export const ARCHITECTURE_PICK_KEY = 'architecturePick'
export const SELECTED_PICK_KEY = 'pickSelected'

const HANDLE_BIAS = 0.2
const SELECTED_BIAS = 0.55
const MOVABLE_BIAS = 0.35

type HitRole = 'handle' | 'movable' | 'architecture' | 'other'

export function isTransformHandle(object: Object3D | null | undefined): boolean {
  return hitRole(object) === 'handle'
}

function dataFlag(object: Object3D | null | undefined, key: string): boolean {
  let node: Object3D | null | undefined = object
  while (node) {
    if (node.userData?.[key]) return true
    node = node.parent
  }
  return false
}

export function hitRole(object: Object3D | null | undefined): HitRole {
  let node: Object3D | null | undefined = object
  while (node) {
    const data = node.userData
    if (data?.[TRANSFORM_HANDLE_KEY]) return 'handle'
    if (data?.planePick) return 'movable'
    if (data?.[ARCHITECTURE_PICK_KEY]) return 'architecture'
    node = node.parent
  }
  return 'other'
}

function isSelectedPick(object: Object3D | null | undefined): boolean {
  return dataFlag(object, SELECTED_PICK_KEY)
}

/**
 * Edit hit order:
 * 1. resize/rotation handles
 * 2. selected furniture/fixture bodies
 * 3. other furniture/fixture bodies
 * 4. floor
 * Architecture never receives edit events (orbit/navigation instead).
 */
export function preferTransformHandles(hits: Intersection[]) {
  if (hits.length === 0) return hits
  const closest = hits[0]
  const closestRole = hitRole(closest.object)

  const handle = hits.find((hit) => hitRole(hit.object) === 'handle')
  if (handle && (closestRole === 'handle' || handle.distance <= closest.distance + HANDLE_BIAS)) {
    return hits.filter((hit) => hitRole(hit.object) === 'handle')
  }

  const selected = hits.find((hit) => hitRole(hit.object) === 'movable' && isSelectedPick(hit.object))
  if (selected && selected.distance <= closest.distance + SELECTED_BIAS) {
    return hits.filter((hit) => hitRole(hit.object) === 'movable' && isSelectedPick(hit.object))
  }

  const movable = hits.find((hit) => hitRole(hit.object) === 'movable')
  if (movable && movable.distance <= closest.distance + MOVABLE_BIAS) {
    return hits.filter((hit) => hitRole(hit.object) === 'movable')
  }

  if (closestRole === 'architecture') return []

  return hits.filter((hit) => {
    const role = hitRole(hit.object)
    return role !== 'handle' && role !== 'architecture'
  })
}
