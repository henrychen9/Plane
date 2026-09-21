import { CameraRig } from './CameraRig'
import { Floors } from './Floors'
import { Lighting } from './Lighting'
import { Furniture3D } from './furniture/Furniture3D'
import { Fixtures3D } from './fixtures/Fixtures3D'
import { Walls3D, useActiveWalls } from './walls/Walls3D'
import { maxWallHeightScene, wallEndpointPoints } from './walls/wallGeometry'
import { boundsOfPolygons } from './floorGeometry'
import { GROUND_COLOR } from './floorStyles'
import { useActiveFloorPolygons } from './useActiveFloorPolygons'
import type { CameraFrame } from './floorGeometry'
import { useMemo } from 'react'
import { useFloorDeselect } from './interaction/useFloorDeselect'
import { CameraModeSync } from './interaction/CameraModeSync'
import { FurnitureTransformControls } from './interaction/FurnitureTransformControls'
import { GroupBounds3D } from './interaction/GroupBounds3D'

/**
 * Coordinate convention for the 3D layer:
 *   X = horizontal floorplan axis
 *   Z = floorplan depth (the 2D plan's vertical axis)
 *   Y = height
 * The floor lives on the XZ plane at Y = 0. Do not use Y as floorplan depth.
 */
export function Scene({ frame }: { frame: CameraFrame }) {
  const polygons = useActiveFloorPolygons()
  const { walls, vertices } = useActiveWalls()
  const wallPoints = useMemo(() => wallEndpointPoints(walls, vertices), [walls, vertices])
  const bounds = useMemo(
    () => boundsOfPolygons(wallPoints.length > 0 ? [...polygons, wallPoints] : polygons),
    [polygons, wallPoints],
  )
  const wallHeight = useMemo(() => maxWallHeightScene(walls), [walls])
  const groundSize = Math.max(64, (bounds?.span ?? 16) * 3.2)
  const groundX = bounds?.centerX ?? frame.centerX
  const groundZ = bounds?.centerZ ?? frame.centerZ
  const lightCenter = useMemo(
    () => [groundX, 0, groundZ] as [number, number, number],
    [groundX, groundZ],
  )
  const deselect = useFloorDeselect()

  return (
    <>
      <CameraRig frame={frame} />
      <CameraModeSync />
      <Lighting span={bounds?.span ?? frame.span} wallHeight={wallHeight} center={lightCenter} />
      <mesh
        position={[groundX, -0.03, groundZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        {...deselect}
      >
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={GROUND_COLOR} roughness={0.96} metalness={0} />
      </mesh>
      <Floors />
      <Walls3D />
      <Fixtures3D />
      <Furniture3D />
      <FurnitureTransformControls />
      <GroupBounds3D />
    </>
  )
}
