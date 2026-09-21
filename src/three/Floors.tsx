import { useEffect, useMemo } from 'react'
import { FrontSide } from 'three'
import { createFloorGeometry, polygonKey } from './floorGeometry'
import { floorStyleOf } from './floorStyles'
import type { Point } from '../types/spatial'
import { useActiveRooms } from './useActiveFloorPolygons'
import { useFloorDeselect } from './interaction/useFloorDeselect'

export function Floors() {
  const rooms = useActiveRooms()
  return (
    <>
      {rooms.map((room) => (
        <FloorMesh key={room.id} polygon={room.polygon} floorMaterial={room.floorMaterial} />
      ))}
    </>
  )
}

function FloorMesh({ polygon, floorMaterial }: { polygon: Point[]; floorMaterial?: string }) {
  const key = polygonKey(polygon)
  const geometry = useMemo(() => createFloorGeometry(polygon), [key, polygon])
  const style = floorStyleOf(floorMaterial)
  const deselect = useFloorDeselect()

  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

  if (!geometry) return null

  return (
    <mesh geometry={geometry} receiveShadow {...deselect}>
      <meshStandardMaterial
        color={style.color}
        roughness={style.roughness}
        metalness={style.metalness}
        side={FrontSide}
      />
    </mesh>
  )
}
