import { Vector3 } from 'three'
import type { Camera } from 'three'
import type { Fixture, FurnitureItem } from '../../types/spatial'
import { useEditorStore } from '../../state/editorStore'
import { furnitureWorldTransform } from '../furniture/furnitureGeometry'
import { fixtureWorldTransform } from '../fixtures/fixtureGeometry'
import { intersectFloorFromNdc, pointerToNdc } from './floorRay'

const capturedIds = new Set<number>()

export const DRAG_THRESHOLD = 4

export const furnitureDrag = {
  item: null as FurnitureItem | null,
  grabbing: false,
  dragging: false,
  historyCaptured: false,
  startClient: { x: 0, y: 0 },
  grabOffset: new Vector3(),
}

export const fixtureDrag = {
  item: null as Fixture | null,
  grabbing: false,
  dragging: false,
  historyCaptured: false,
  startClient: { x: 0, y: 0 },
  grabOffset: new Vector3(),
}

export function capturePointer(element: Element, pointerId: number) {
  capturedIds.add(pointerId)
  if ('setPointerCapture' in element) element.setPointerCapture(pointerId)
}

export function releaseTrackedPointerCaptures(element: HTMLElement) {
  for (const id of [...capturedIds]) {
    try {
      if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id)
    } catch {
      /* already released */
    }
  }
  capturedIds.clear()
}

export function resetFurnitureDrag(element?: HTMLElement) {
  furnitureDrag.item = null
  furnitureDrag.grabbing = false
  furnitureDrag.dragging = false
  furnitureDrag.historyCaptured = false
  resetFixtureDrag()
  const editor = useEditorStore.getState()
  if (editor.draggingId) editor.setDraggingId(null)
  if (element) {
    element.style.cursor = ''
    releaseTrackedPointerCaptures(element)
  }
}

export function resetFixtureDrag() {
  fixtureDrag.item = null
  fixtureDrag.grabbing = false
  fixtureDrag.dragging = false
  fixtureDrag.historyCaptured = false
}

export function beginFurniturePointer(
  item: FurnitureItem,
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
) {
  furnitureDrag.item = item
  furnitureDrag.grabbing = true
  furnitureDrag.dragging = false
  furnitureDrag.historyCaptured = false
  furnitureDrag.startClient = { x: clientX, y: clientY }
  furnitureDrag.grabOffset.set(0, 0, 0)
  if (item.locked) return
  if (!pointerToNdc(clientX, clientY, canvas)) return
  const hit = intersectFloorFromNdc(camera)
  if (!hit) return
  const center = furnitureWorldTransform(item).position
  furnitureDrag.grabOffset.set(hit.x - center[0], 0, hit.z - center[2])
}

export function beginFixturePointer(
  item: Fixture,
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
) {
  fixtureDrag.item = item
  fixtureDrag.grabbing = true
  fixtureDrag.dragging = false
  fixtureDrag.historyCaptured = false
  fixtureDrag.startClient = { x: clientX, y: clientY }
  fixtureDrag.grabOffset.set(0, 0, 0)
  if (!pointerToNdc(clientX, clientY, canvas)) return true
  const hit = intersectFloorFromNdc(camera)
  if (!hit) return true
  const center = fixtureWorldTransform(item).position
  fixtureDrag.grabOffset.set(hit.x - center[0], 0, hit.z - center[2])
  return true
}
