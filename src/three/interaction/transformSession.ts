import type { Camera } from 'three'
import type { FurnitureItem } from '../../types/spatial'
import { furnitureWorldTransform } from '../furniture/furnitureGeometry'
import { intersectFloorFromNdc, pointerToNdc } from './floorRay'
import { resetFurnitureDrag } from './pointerSession'
import { resetGroupDrag } from './groupDragSession'
import type { CornerId } from './furnitureTransform'
import { worldAngleFromCenter } from './furnitureTransform'

export type TransformSessionKind = 'idle' | 'rotate' | 'resize'

export const furnitureTransform = {
  kind: 'idle' as TransformSessionKind,
  grabbing: false,
  dragging: false,
  historyCaptured: false,
  startClient: { x: 0, y: 0 },
  start: null as FurnitureItem | null,
  startAngle: 0,
  centerX: 0,
  centerZ: 0,
  corner: 'se' as CornerId,
}

function snapshotItem(item: FurnitureItem): FurnitureItem {
  return { ...item, shapeData: item.shapeData ? { ...item.shapeData } : undefined }
}

export function resetFurnitureTransform(element?: HTMLElement) {
  furnitureTransform.kind = 'idle'
  furnitureTransform.grabbing = false
  furnitureTransform.dragging = false
  furnitureTransform.historyCaptured = false
  furnitureTransform.start = null
  resetFurnitureDrag(element)
  resetGroupDrag(true)
}

export function beginRotatePointer(
  item: FurnitureItem,
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
) {
  if (!pointerToNdc(clientX, clientY, canvas)) return false
  const hit = intersectFloorFromNdc(camera)
  if (!hit) return false
  const center = furnitureWorldTransform(item).position
  furnitureTransform.kind = 'rotate'
  furnitureTransform.grabbing = true
  furnitureTransform.dragging = false
  furnitureTransform.historyCaptured = false
  furnitureTransform.startClient = { x: clientX, y: clientY }
  furnitureTransform.start = snapshotItem(item)
  furnitureTransform.centerX = center[0]
  furnitureTransform.centerZ = center[2]
  furnitureTransform.startAngle = worldAngleFromCenter(hit.x, hit.z, center[0], center[2])
  return Number.isFinite(furnitureTransform.startAngle)
}

export function beginResizePointer(item: FurnitureItem, corner: CornerId, clientX: number, clientY: number) {
  furnitureTransform.kind = 'resize'
  furnitureTransform.grabbing = true
  furnitureTransform.dragging = false
  furnitureTransform.historyCaptured = false
  furnitureTransform.startClient = { x: clientX, y: clientY }
  furnitureTransform.start = snapshotItem(item)
  furnitureTransform.corner = corner
  return true
}
