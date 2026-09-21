import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useEditorStore } from '../state/editorStore'
import { isTextInput } from '../utils/time'
import { inchesToSceneUnits } from './utils/units'
import { capturePointer, releaseTrackedPointerCaptures } from './interaction/pointerSession'

const EYE_HEIGHT = inchesToSceneUnits(66)
const LOOK_SENSITIVITY = 0.005
const MOVE_SPEED = 7.2
const PITCH_MIN = -1.15
const PITCH_MAX = 1.15

export function WalkControls({ centerX, centerZ }: { centerX: number; centerZ: number }) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const setCameraMode = useEditorStore((state) => state.setCameraMode)
  const yaw = useRef(0)
  const pitch = useRef(-0.12)
  const keys = useRef(new Set<string>())
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  useEffect(() => {
    camera.position.set(centerX, EYE_HEIGHT, centerZ)
    yaw.current = 0
    pitch.current = -0.12
    camera.rotation.order = 'YXZ'
    camera.rotation.set(pitch.current, yaw.current, 0)
  }, [camera, centerX, centerZ])

  useEffect(() => {
    const element = gl.domElement
    let capturedId: number | null = null

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      dragging.current = true
      last.current = { x: event.clientX, y: event.clientY }
      capturedId = event.pointerId
      capturePointer(element, event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return
      const dx = event.clientX - last.current.x
      const dy = event.clientY - last.current.y
      last.current = { x: event.clientX, y: event.clientY }
      yaw.current -= dx * LOOK_SENSITIVITY
      pitch.current = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitch.current - dy * LOOK_SENSITIVITY))
      camera.rotation.order = 'YXZ'
      camera.rotation.set(pitch.current, yaw.current, 0)
    }
    const onUp = (event: PointerEvent) => {
      dragging.current = false
      capturedId = null
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextInput(event.target)) return
      if (event.key === 'Escape') {
        event.preventDefault()
        setCameraMode('orbit')
        return
      }
      const code = event.code
      if (
        code === 'KeyW' ||
        code === 'KeyA' ||
        code === 'KeyS' ||
        code === 'KeyD' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight'
      ) {
        event.preventDefault()
        keys.current.add(code)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code)
    }

    element.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      dragging.current = false
      keys.current.clear()
      if (capturedId != null && element.hasPointerCapture(capturedId)) {
        try {
          element.releasePointerCapture(capturedId)
        } catch {
          /* already released */
        }
      }
      releaseTrackedPointerCaptures(element)
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }
      element.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [camera, gl, setCameraMode])

  useFrame((_, delta) => {
    const pressed = keys.current
    if (pressed.size === 0) return
    const step = MOVE_SPEED * Math.min(delta, 0.05)
    const sin = Math.sin(yaw.current)
    const cos = Math.cos(yaw.current)
    let dx = 0
    let dz = 0
    if (pressed.has('KeyW') || pressed.has('ArrowUp')) {
      dx -= sin
      dz -= cos
    }
    if (pressed.has('KeyS') || pressed.has('ArrowDown')) {
      dx += sin
      dz += cos
    }
    if (pressed.has('KeyA') || pressed.has('ArrowLeft')) {
      dx -= cos
      dz += sin
    }
    if (pressed.has('KeyD') || pressed.has('ArrowRight')) {
      dx += cos
      dz -= sin
    }
    const len = Math.hypot(dx, dz)
    if (len < 1e-6) return
    camera.position.x += (dx / len) * step
    camera.position.z += (dz / len) * step
    camera.position.y = EYE_HEIGHT
    if (!Number.isFinite(camera.position.x) || !Number.isFinite(camera.position.z)) {
      camera.position.set(centerX, EYE_HEIGHT, centerZ)
    }
  })

  return null
}
