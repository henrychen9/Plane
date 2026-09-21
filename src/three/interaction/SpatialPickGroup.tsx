import { useState, type ReactNode } from 'react'
import { Mesh } from 'three'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { inchesToSceneUnits } from '../utils/units'
import { freeSelections } from '../../editor/selection'
import { useEditorStore } from '../../state/editorStore'
import { SELECTED_PICK_KEY } from './handleRaycast'
import { SelectionOutline } from './SelectionOutline'

function skipRaycast() {}

export function SpatialPickGroup({
  width,
  depth,
  height,
  selected,
  pickId,
  onPointerDown,
  children,
}: {
  width: number
  depth: number
  height: number
  selected: boolean
  pickId: string
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void
  children: ReactNode
}) {
  const cameraMode = useEditorStore((state) => state.cameraMode)
  const grouped = useEditorStore((state) => freeSelections(state.selections).length > 1)
  const walk = cameraMode === 'walk'
  const gl = useThree((state) => state.gl)
  const [hovered, setHovered] = useState(false)
  const pickHeight = Math.max(height, 0.25)
  const pickData = { planePick: true, spatialId: pickId, [SELECTED_PICK_KEY]: selected }

  return (
    <group
      onPointerDown={
        walk
          ? undefined
          : (event) => {
              event.stopPropagation()
              onPointerDown(event)
            }
      }
      onPointerOver={
        walk
          ? undefined
          : (event) => {
              event.stopPropagation()
              setHovered(true)
              if (!useEditorStore.getState().draggingId) gl.domElement.style.cursor = 'pointer'
            }
      }
      onPointerOut={
        walk
          ? undefined
          : () => {
              setHovered(false)
              if (!useEditorStore.getState().draggingId) gl.domElement.style.cursor = ''
            }
      }
    >
      {children}
      <mesh
        key={walk ? `pick-walk-${pickId}` : `pick-orbit-${pickId}`}
        position={[0, inchesToSceneUnits(pickHeight) / 2, 0]}
        userData={pickData}
        raycast={walk ? skipRaycast : Mesh.prototype.raycast}
      >
        <boxGeometry
          args={[inchesToSceneUnits(width), inchesToSceneUnits(pickHeight), inchesToSceneUnits(depth)]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {walk ? null : (
        <SelectionOutline
          width={width}
          depth={depth}
          height={pickHeight}
          selected={selected}
          hovered={hovered && !selected}
          muted={selected && grouped}
        />
      )}
    </group>
  )
}
