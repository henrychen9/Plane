import { DoubleSide, FrontSide, Mesh } from 'three'
import type { OpeningRect, WallFrame } from './openingGeometry'
import { windowParts } from './openingGeometry'
import { ARCHITECTURE_PICK_KEY } from '../interaction/handleRaycast'

const skipRaycast = () => {}
const occluder = { [ARCHITECTURE_PICK_KEY]: true }

export function Window3D({
  frame,
  opening,
  walk,
}: {
  frame: WallFrame
  opening: OpeningRect
  walk: boolean
}) {
  const parts = windowParts(frame, opening)
  if (!parts) return null

  return (
    <group userData={occluder}>
      {parts.frames.map((box, index) => (
        <mesh
          key={index}
          position={box.position}
          castShadow
          receiveShadow
          userData={occluder}
          raycast={walk ? skipRaycast : Mesh.prototype.raycast}
        >
          <boxGeometry args={box.size} />
          <meshStandardMaterial color="#d8d2c7" roughness={0.74} metalness={0.05} side={FrontSide} />
        </mesh>
      ))}
      <mesh
        position={parts.glass.position}
        userData={occluder}
        raycast={walk ? skipRaycast : Mesh.prototype.raycast}
      >
        <boxGeometry args={parts.glass.size} />
        <meshStandardMaterial
          color="#8aa9b8"
          transparent
          opacity={0.34}
          roughness={0.16}
          metalness={0.02}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}
