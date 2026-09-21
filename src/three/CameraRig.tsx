import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { OrthographicCamera, PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { OrthographicCamera as ThreeOrtho } from 'three'
import { useEditorStore } from '../state/editorStore'
import type { CameraFrame } from './floorGeometry'
import { WalkControls } from './WalkControls'
import { inchesToSceneUnits } from './utils/units'

export const DEFAULT_CAMERA_FRAME: CameraFrame = {
  target: [0, 0, 0],
  position: [8, 8, 8],
  minDistance: 3,
  maxDistance: 48,
  far: 240,
  centerX: 0,
  centerZ: 0,
  width: 16,
  depth: 16,
  span: 16,
}

const EYE_HEIGHT = inchesToSceneUnits(66)

export function CameraRig({ frame }: { frame: CameraFrame }) {
  const mode = useEditorStore((state) => state.cameraMode)
  const fitNonce = useEditorStore((state) => state.threeFitNonce)
  const draggingId = useEditorStore((state) => state.draggingId)
  const orbitEnabled = !draggingId

  if (mode === 'walk') {
    return (
      <>
        <PerspectiveCamera
          makeDefault
          fov={68}
          near={0.08}
          far={frame.far}
          position={[frame.centerX, EYE_HEIGHT, frame.centerZ]}
        />
        <WalkControls centerX={frame.centerX} centerZ={frame.centerZ} />
      </>
    )
  }

  if (mode === 'top') {
    return <TopRig frame={frame} fitNonce={fitNonce} enabled={orbitEnabled} />
  }

  return <OrbitRig frame={frame} fitNonce={fitNonce} enabled={orbitEnabled} />
}

function OrbitRig({
  frame,
  fitNonce,
  enabled,
}: {
  frame: CameraFrame
  fitNonce: number
  enabled: boolean
}) {
  const controls = useRef<OrbitControlsImpl>(null)
  const frameRef = useRef(frame)
  const camera = useThree((state) => state.camera)
  frameRef.current = frame
  const [clip, setClip] = useState(() => ({
    far: frame.far,
    minDistance: frame.minDistance,
    maxDistance: frame.maxDistance,
  }))

  const applyFrame = useCallback(
    (orbit: OrbitControlsImpl | null) => {
      const next = frameRef.current
      camera.position.set(next.position[0], next.position[1], next.position[2])
      camera.near = 0.1
      camera.far = next.far
      camera.updateProjectionMatrix()
      if (!orbit) return
      orbit.target.set(next.target[0], next.target[1], next.target[2])
      orbit.minDistance = next.minDistance
      orbit.maxDistance = next.maxDistance
      orbit.update()
    },
    [camera],
  )

  const setControls = useCallback(
    (node: OrbitControlsImpl | null) => {
      controls.current = node
      if (node) applyFrame(node)
    },
    [applyFrame],
  )

  useLayoutEffect(() => {
    const next = frameRef.current
    setClip({ far: next.far, minDistance: next.minDistance, maxDistance: next.maxDistance })
    applyFrame(controls.current)
  }, [applyFrame, fitNonce])

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={45}
        near={0.1}
        far={clip.far}
      />
      <OrbitControls
        ref={setControls}
        makeDefault
        enabled={enabled}
        enableDamping={enabled}
        dampingFactor={0.08}
        enablePan
        enableRotate
        enableZoom
        minDistance={clip.minDistance}
        maxDistance={clip.maxDistance}
        maxPolarAngle={Math.PI / 2 - 0.06}
      />
    </>
  )
}

function TopRig({
  frame,
  fitNonce,
  enabled,
}: {
  frame: CameraFrame
  fitNonce: number
  enabled: boolean
}) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camRef = useRef<ThreeOrtho>(null)
  const frameRef = useRef(frame)
  const size = useThree((state) => state.size)
  frameRef.current = frame
  const [clipFar, setClipFar] = useState(frame.far)

  const applyFrame = useCallback(
    (orbit: OrbitControlsImpl | null) => {
      const cam = camRef.current
      if (!cam) return
      const next = frameRef.current
      const altitude = Math.max(next.span * 1.6, 18)
      const aspect = size.width / Math.max(size.height, 1)
      const pad = 1.28
      const halfW = Math.max(next.width * pad, next.depth * pad * aspect, 4) / 2
      const halfH = halfW / aspect
      cam.up.set(0, 0, -1)
      cam.position.set(next.centerX, altitude, next.centerZ)
      cam.near = 0.1
      cam.far = next.far
      cam.left = -halfW
      cam.right = halfW
      cam.top = halfH
      cam.bottom = -halfH
      cam.zoom = 1
      cam.lookAt(next.centerX, 0, next.centerZ)
      cam.updateProjectionMatrix()
      if (!orbit) return
      orbit.target.set(next.centerX, 0, next.centerZ)
      orbit.update()
    },
    [size.height, size.width],
  )

  const setCamera = useCallback(
    (node: ThreeOrtho | null) => {
      camRef.current = node
      if (node) applyFrame(controls.current)
    },
    [applyFrame],
  )

  const setControls = useCallback(
    (node: OrbitControlsImpl | null) => {
      controls.current = node
      if (node) applyFrame(node)
    },
    [applyFrame],
  )

  useLayoutEffect(() => {
    setClipFar(frameRef.current.far)
    applyFrame(controls.current)
  }, [applyFrame, fitNonce])

  return (
    <>
      <OrthographicCamera
        ref={setCamera}
        makeDefault
        near={0.1}
        far={clipFar}
      />
      <OrbitControls
        ref={setControls}
        makeDefault
        enabled={enabled}
        enableDamping={enabled}
        dampingFactor={0.1}
        enablePan
        enableRotate={false}
        enableZoom
        minZoom={0.35}
        maxZoom={8}
      />
    </>
  )
}
