import { useEffect, useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useEditorStore } from '../../state/editorStore'
import { useProjectStore } from '../../state/projectStore'
import { topLeftInchesFromCenterScene } from '../furniture/furnitureGeometry'
import { intersectFloorFromNdc, pointerToNdc } from './floorRay'
import { resetFloorPointer } from './useFloorDeselect'
import { DRAG_THRESHOLD, fixtureDrag, furnitureDrag, releaseTrackedPointerCaptures } from './pointerSession'
import {
  floorHitToPlanInches,
  resizeFromCorner,
  rotationFromDrag,
} from './furnitureTransform'
import { furnitureTransform } from './transformSession'
import { applyGroupPointer, groupDrag, resetGroupDrag } from './groupDragSession'
import { lockOrbitControls, unlockOrbitControls } from './orbitLock'

export function CameraModeSync() {
  const mode = useEditorStore((state) => state.cameraMode)
  const draggingId = useEditorStore((state) => state.draggingId)
  const gl = useThree((state) => state.gl)
  const get = useThree((state) => state.get)

  const finish = () => {
    const editor = useEditorStore.getState()
    const controls = get().controls as OrbitControlsImpl | undefined
    resetGroupDrag(true)
    furnitureDrag.item = null
    furnitureDrag.grabbing = false
    furnitureDrag.dragging = false
    furnitureDrag.historyCaptured = false
    fixtureDrag.item = null
    fixtureDrag.grabbing = false
    fixtureDrag.dragging = false
    fixtureDrag.historyCaptured = false
    furnitureTransform.kind = 'idle'
    furnitureTransform.grabbing = false
    furnitureTransform.dragging = false
    furnitureTransform.historyCaptured = false
    furnitureTransform.start = null
    if (editor.draggingId) editor.setDraggingId(null)
    unlockOrbitControls(controls, editor.cameraMode === 'walk')
    gl.domElement.style.cursor = ''
    releaseTrackedPointerCaptures(gl.domElement)
  }

  useLayoutEffect(() => {
    const state = get()
    finish()
    resetFloorPointer()
    state.camera.updateMatrixWorld(true)
    state.camera.updateProjectionMatrix()
    const controls = state.controls as OrbitControlsImpl | undefined
    unlockOrbitControls(controls, mode === 'walk')
    if (controls && 'enabled' in controls) controls.enabled = mode !== 'walk'
    state.invalidate()
  }, [get, mode])

  useEffect(() => {
    return () => finish()
  }, [])

  useEffect(() => {
    if (!draggingId) return
    const blockWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener('wheel', blockWheel, { passive: false, capture: true })
    return () => window.removeEventListener('wheel', blockWheel, { capture: true })
  }, [draggingId])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const editor = useEditorStore.getState()
      if (editor.cameraMode === 'walk') return
      const three = get()
      const controls = three.controls as OrbitControlsImpl | undefined
      if (
        furnitureTransform.grabbing ||
        furnitureDrag.grabbing ||
        fixtureDrag.grabbing ||
        groupDrag.grabbing
      ) {
        lockOrbitControls(controls)
      }

      if (furnitureTransform.grabbing && furnitureTransform.start) {
        const start = furnitureTransform.start
        if (start.locked) return
        const dx = event.clientX - furnitureTransform.startClient.x
        const dy = event.clientY - furnitureTransform.startClient.y
        if (!furnitureTransform.dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
          furnitureTransform.dragging = true
          if (!furnitureTransform.historyCaptured) {
            editor.captureHistory()
            furnitureTransform.historyCaptured = true
          }
          gl.domElement.style.cursor = 'grabbing'
        }
        if (!pointerToNdc(event.clientX, event.clientY, three.gl.domElement)) return
        const hit = intersectFloorFromNdc(three.camera)
        if (!hit || !editor.projectId || !editor.layoutId) return
        if (furnitureTransform.kind === 'rotate') {
          const rotation = rotationFromDrag(
            start.rotation || 0,
            furnitureTransform.startAngle,
            hit.x,
            hit.z,
            furnitureTransform.centerX,
            furnitureTransform.centerZ,
            editor.shiftHeld || event.shiftKey,
          )
          if (rotation == null) return
          useProjectStore.getState().updateFurniture(editor.projectId, editor.layoutId, start.id, { rotation })
          return
        }
        const plan = floorHitToPlanInches(hit.x, hit.z)
        const next = resizeFromCorner(start, furnitureTransform.corner, plan.x, plan.y)
        if (!next) return
        useProjectStore.getState().updateFurniture(editor.projectId, editor.layoutId, start.id, next)
        return
      }

      if (groupDrag.grabbing) {
        const dx = event.clientX - groupDrag.startClient.x
        const dy = event.clientY - groupDrag.startClient.y
        if (!groupDrag.dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
          groupDrag.dragging = true
          gl.domElement.style.cursor = 'grabbing'
        }
        applyGroupPointer(event.clientX, event.clientY, three.gl.domElement, three.camera)
        return
      }

      const item = furnitureDrag.item
      if (furnitureDrag.grabbing && item) {
        if (item.locked) return
        const dx = event.clientX - furnitureDrag.startClient.x
        const dy = event.clientY - furnitureDrag.startClient.y
        if (!furnitureDrag.dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
          furnitureDrag.dragging = true
          if (!furnitureDrag.historyCaptured) {
            editor.captureHistory()
            furnitureDrag.historyCaptured = true
          }
          gl.domElement.style.cursor = 'grabbing'
        }
        if (!pointerToNdc(event.clientX, event.clientY, three.gl.domElement)) return
        const hit = intersectFloorFromNdc(three.camera)
        if (!hit || !editor.projectId || !editor.layoutId) return
        const next = topLeftInchesFromCenterScene(
          hit.x - furnitureDrag.grabOffset.x,
          hit.z - furnitureDrag.grabOffset.z,
          item.width,
          item.depth,
        )
        if (![next.x, next.y].every(Number.isFinite)) return
        useProjectStore.getState().updateFurniture(editor.projectId, editor.layoutId, item.id, {
          x: next.x,
          y: next.y,
        })
        return
      }

      const fixture = fixtureDrag.item
      if (!fixtureDrag.grabbing || !fixture) return
      if (fixture.locked) return
      const dx = event.clientX - fixtureDrag.startClient.x
      const dy = event.clientY - fixtureDrag.startClient.y
      if (!fixtureDrag.dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        fixtureDrag.dragging = true
        if (!fixtureDrag.historyCaptured) {
          editor.captureHistory()
          fixtureDrag.historyCaptured = true
        }
        gl.domElement.style.cursor = 'grabbing'
      }
      if (!pointerToNdc(event.clientX, event.clientY, three.gl.domElement)) return
      const hit = intersectFloorFromNdc(three.camera)
      if (!hit || !editor.projectId || !editor.layoutId) return
      const next = topLeftInchesFromCenterScene(
        hit.x - fixtureDrag.grabOffset.x,
        hit.z - fixtureDrag.grabOffset.z,
        fixture.width,
        fixture.depth,
      )
      if (![next.x, next.y].every(Number.isFinite)) return
      useProjectStore.getState().patchLayout(
        editor.projectId,
        editor.layoutId,
        (layout) => ({
          ...layout,
          plan: {
            ...layout.plan,
            fixtures: layout.plan.fixtures.map((entry) =>
              entry.id === fixture.id ? { ...entry, x: next.x, y: next.y } : entry,
            ),
          },
        }),
        { rebuild: false },
      )
    }
    const onUp = () => {
      if (
        !furnitureDrag.grabbing &&
        !furnitureTransform.grabbing &&
        !fixtureDrag.grabbing &&
        !groupDrag.grabbing
      ) {
        return
      }
      finish()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [get, gl])

  return null
}
