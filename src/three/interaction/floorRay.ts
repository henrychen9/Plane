import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { Camera } from 'three'

const FLOOR = new Plane(new Vector3(0, 1, 0), 0)
const ndc = new Vector2()
const hit = new Vector3()
const raycaster = new Raycaster()

export function pointerToNdc(clientX: number, clientY: number, canvas: HTMLCanvasElement): Vector2 | null {
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null
  ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
  if (!Number.isFinite(ndc.x) || !Number.isFinite(ndc.y)) return null
  return ndc
}

export function intersectFloorFromNdc(camera: Camera): Vector3 | null {
  raycaster.setFromCamera(ndc, camera)
  if (!raycaster.ray.intersectPlane(FLOOR, hit)) return null
  if (!Number.isFinite(hit.x) || !Number.isFinite(hit.y) || !Number.isFinite(hit.z)) return null
  return hit.clone()
}
