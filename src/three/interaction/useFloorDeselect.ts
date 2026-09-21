import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useEditorStore } from '../../state/editorStore'
import { fixtureDrag, furnitureDrag } from './pointerSession'
import { groupDrag } from './groupDragSession'
import { hitRole } from './handleRaycast'

const CLICK_SLOP = 6
let pointerDown: { x: number; y: number } | null = null

export function resetFloorPointer() {
  pointerDown = null
}

function shouldIgnoreFloor(event: ThreeEvent<PointerEvent>) {
  const editor = useEditorStore.getState()
  return editor.cameraMode === 'walk' || event.button !== 0
}

export function useFloorDeselect() {
  return useMemo(
    () => ({
      onPointerDown: (event: ThreeEvent<PointerEvent>) => {
        if (shouldIgnoreFloor(event)) return
        if (event.intersections.some((hit) => hitRole(hit.object) !== 'other')) return
        pointerDown = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
      },
      onPointerUp: (event: ThreeEvent<PointerEvent>) => {
        if (!pointerDown) return
        const dx = event.nativeEvent.clientX - pointerDown.x
        const dy = event.nativeEvent.clientY - pointerDown.y
        pointerDown = null
        if (Math.hypot(dx, dy) > CLICK_SLOP) return
        const editor = useEditorStore.getState()
        if (editor.cameraMode === 'walk' || editor.draggingId) return
        if (furnitureDrag.grabbing || fixtureDrag.grabbing || groupDrag.grabbing) return
        if (event.intersections.some((hit) => hitRole(hit.object) !== 'other')) return
        editor.setSelection(null)
      },
    }),
    [],
  )
}

export function clearFurnitureSelectionIfClick(event: { type: string }) {
  if (event.type !== 'click') return
  const editor = useEditorStore.getState()
  if (editor.cameraMode === 'walk' || editor.draggingId) return
  if (furnitureDrag.grabbing || fixtureDrag.grabbing || groupDrag.grabbing) return
  editor.setSelection(null)
}
