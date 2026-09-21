import { memo, useMemo } from 'react'
import { FrontSide, Mesh } from 'three'
import type { Door, Vertex, Wall, WindowOpening } from '../../types/spatial'
import { useEditorStore } from '../../state/editorStore'
import { Door3D } from '../openings/Door3D'
import { Window3D } from '../openings/Window3D'
import {
  openingRectsForWall,
  solidBox,
  wallFrame,
  wallOpeningsSnapshot,
  wallSolids,
} from '../openings/openingGeometry'
import { ARCHITECTURE_PICK_KEY } from '../interaction/handleRaycast'

const skipRaycast = () => {}
const occluder = { [ARCHITECTURE_PICK_KEY]: true }

export const Wall3D = memo(
  function Wall3D({
    wall,
    vertices,
    doors,
    windows,
  }: {
    wall: Wall
    vertices: Vertex[]
    doors: Door[]
    windows: WindowOpening[]
  }) {
    const cameraMode = useEditorStore((state) => state.cameraMode)
    const snapshot = wallOpeningsSnapshot(wall, vertices, doors, windows)
    const model = useMemo(() => {
      const frame = wallFrame(wall, vertices)
      if (!frame) return null
      const openings = openingRectsForWall(frame, doors, windows)
      const solids = wallSolids(frame, openings)
        .map((solid) => solidBox(frame, solid))
        .filter((box): box is NonNullable<typeof box> => box !== null)
      return { frame, openings, solids }
    }, [snapshot, wall, vertices, doors, windows])

    if (!model) return null

    const walk = cameraMode === 'walk'

    return (
      <group position={model.frame.origin} rotation={[0, model.frame.rotationY, 0]} userData={occluder}>
        {model.solids.map((box, index) => (
          <mesh
            key={`${snapshot}:s${index}`}
            position={box.position}
            castShadow
            receiveShadow
            userData={occluder}
            raycast={walk ? skipRaycast : Mesh.prototype.raycast}
          >
            <boxGeometry args={box.size} />
            <meshStandardMaterial color="#f2eee6" roughness={0.88} metalness={0} side={FrontSide} />
          </mesh>
        ))}
        {doors.map((door) => {
          const opening = model.openings.find((item) => item.id === door.id)
          if (!opening) return null
          return <Door3D key={door.id} frame={model.frame} door={door} opening={opening} walk={walk} />
        })}
        {windows.map((window) => {
          const opening = model.openings.find((item) => item.id === window.id)
          if (!opening) return null
          return <Window3D key={window.id} frame={model.frame} opening={opening} walk={walk} />
        })}
      </group>
    )
  },
  (prev, next) =>
    wallOpeningsSnapshot(prev.wall, prev.vertices, prev.doors, prev.windows) ===
    wallOpeningsSnapshot(next.wall, next.vertices, next.doors, next.windows),
)
