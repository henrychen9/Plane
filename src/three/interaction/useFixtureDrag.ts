import { useCallback, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Fixture } from '../../types/spatial'
import { useEditorStore } from '../../state/editorStore'
import { beginFixturePointer, capturePointer } from './pointerSession'
import { beginGroupPointer } from './groupDragSession'
import { furnitureTransform } from './transformSession'
import { isTransformHandle } from './handleRaycast'
import { blockNativeTransformEvent, lockOrbitControls, unlockOrbitControls } from './orbitLock'
import { applySpatialClick } from './spatialSelect'

export function useFixtureDrag(fixture: Fixture) {
  const get = useThree((state) => state.get)
  const fixtureRef = useRef(fixture)
  fixtureRef.current = fixture

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
      const current = fixtureRef.current
      const intent = applySpatialClick('fixture', current.id, event.nativeEvent.shiftKey)
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
      beginFixturePointer(
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
