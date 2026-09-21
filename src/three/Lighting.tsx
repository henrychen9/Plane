import { useLayoutEffect, useMemo, useRef } from 'react'
import { PCFSoftShadowMap } from 'three'
import { useThree } from '@react-three/fiber'
import { useEditorStore } from '../state/editorStore'

export function Lighting({
  span = 20,
  wallHeight = 0,
  center = [0, 0, 0],
}: {
  span?: number
  wallHeight?: number
  center?: [number, number, number]
}) {
  const gl = useThree((state) => state.gl)
  const draggingId = useEditorStore((state) => state.draggingId)
  const hold = useRef({ span, wallHeight, cx: center[0], cz: center[2] })
  if (!draggingId) {
    hold.current = { span, wallHeight, cx: center[0], cz: center[2] }
  }
  const lit = hold.current
  const lighting = useMemo(() => {
    const reach = Math.max(lit.span, lit.wallHeight * 2, 12)
    return {
      reach,
      position: [
        lit.cx + reach * 0.52,
        Math.max(reach * 1.08, lit.wallHeight * 2.3),
        lit.cz + reach * 0.34,
      ] as [number, number, number],
      target: [lit.cx, 0, lit.cz] as [number, number, number],
      fill: [lit.cx - reach * 0.4, reach * 0.52, lit.cz - reach * 0.28] as [number, number, number],
    }
  }, [lit.span, lit.wallHeight, lit.cx, lit.cz])

  useLayoutEffect(() => {
    gl.shadowMap.enabled = true
    gl.shadowMap.type = PCFSoftShadowMap
    gl.toneMappingExposure = 1.04
  }, [gl])

  return (
    <>
      <hemisphereLight args={['#f6f0e6', '#b9b2a8', 0.62]} />
      <directionalLight
        castShadow
        color="#fff3e4"
        intensity={1.18}
        position={lighting.position}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.00018}
        shadow-normalBias={0.035}
        shadow-radius={2.2}
        shadow-camera-near={0.6}
        shadow-camera-far={lighting.reach * 5}
        shadow-camera-left={-lighting.reach * 0.95}
        shadow-camera-right={lighting.reach * 0.95}
        shadow-camera-top={lighting.reach * 0.95}
        shadow-camera-bottom={-lighting.reach * 0.95}
      >
        <object3D attach="target" position={lighting.target} />
      </directionalLight>
      <directionalLight color="#e7eef3" intensity={0.2} position={lighting.fill} />
    </>
  )
}
