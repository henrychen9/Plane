import { FrontSide, Mesh } from 'three'
import type { Door } from '../../types/spatial'
import type { OpeningRect, WallFrame } from './openingGeometry'
import { doorSlabPose } from './openingGeometry'
import { ARCHITECTURE_PICK_KEY } from '../interaction/handleRaycast'

const skipRaycast = () => {}
const occluder = { [ARCHITECTURE_PICK_KEY]: true }

export function Door3D({
  frame,
  door,
  opening,
  walk,
}: {
  frame: WallFrame
  door: Door
  opening: OpeningRect
  walk: boolean
}) {
  const pose = doorSlabPose(frame, door, opening)

  return (
    <group position={pose.hinge} rotation={[0, pose.rotationY, 0]} userData={occluder}>
      <mesh
        position={pose.centerOffset}
        castShadow
        receiveShadow
        userData={occluder}
        raycast={walk ? skipRaycast : Mesh.prototype.raycast}
      >
        <boxGeometry args={pose.size} />
        <meshStandardMaterial color="#8d7f70" roughness={0.82} metalness={0.02} side={FrontSide} />
      </mesh>
    </group>
  )
}
