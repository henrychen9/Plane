import { useCallback, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { FurnitureItem } from '../../types/spatial'
import { useEditorStore } from '../../state/editorStore'
import { beginFurniturePointer, capturePointer } from './pointerSession'
import { beginGroupPointer } from './groupDragSession'
import { furnitureTransform } from './transformSession'
import { isTransformHandle } from './handleRaycast'
import { blockNativeTransformEvent, lockOrbitControls, unlockOrbitControls } from './orbitLock'
import { applySpatialClick } from './spatialSelect'

export function useFurnitureDrag(item: FurnitureItem) {
  const get = useThree((state) => state.get)
  const itemRef = useRef(item)
  itemRef.current = item

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const editor = useEditorStore.getState()
      if (editor.cameraMode === 'walk' || event.button !== 0) return
      if (isTransformHandle(event.object) || isTransformHandle(event.eventObject)) return
      if (furnitureTransform.grabbing) {
        furnitureTransform.kind = 'idle'
        furnitureTransform.grabbing = false
        furnitureTransform.dragging = false
        furnitureTransform.start = null
      }
      blockNativeTransformEvent(event)
      const current = itemRef.current
      const intent = applySpatialClick('furniture', current.id, event.nativeEvent.shiftKey)
      if (intent === 'toggle') return
      const three = get()
      const controls = three.controls as OrbitControlsImpl | undefined
      if (intent === 'group') {
        lockOrbitControls(controls)
        editor.setDraggingId(current.id)
        if (!beginGroupPointer(event.nativeEvent.clientX, event.nativeEvent.clientY, three.gl.domElement, three.camera)) {
          editor.setDraggingId(null)
          unlockOrbitControls(controls, false)
          return
        }
        capturePointer(three.gl.domElement, event.nativeEvent.pointerId)
        three.gl.domElement.style.cursor = 'grabbing'
        return
      }
      if (current.locked) return
      lockOrbitControls(controls)
      editor.setDraggingId(current.id)
      beginFurniturePointer(
        current,
        event.nativeEvent.clientX,
        event.nativeEvent.clientY,
        three.gl.domElement,
        three.camera,
      )
      capturePointer(three.gl.domElement, event.nativeEvent.pointerId)
      three.gl.domElement.style.cursor = 'grabbing'
    },
    [get],
  )

  return { onPointerDown }
}
