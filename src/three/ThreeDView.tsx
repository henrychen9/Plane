import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './Scene'
import { DEFAULT_CAMERA_FRAME } from './CameraRig'
import { ViewportChrome } from './ViewportChrome'
import { boundsOfPolygons, cameraFrameFromBounds } from './floorGeometry'
import { SCENE_BACKGROUND } from './floorStyles'
import { useActiveFloorPolygons } from './useActiveFloorPolygons'
import { useEditorStore } from '../state/editorStore'
import type { Point } from '../types/spatial'
import { useActiveFurniture } from './furniture/Furniture3D'
import { maxFurnitureHeightScene } from './furniture/furnitureGeometry'
import { useActiveWalls } from './walls/Walls3D'
import { maxWallHeightScene, wallEndpointPoints } from './walls/wallGeometry'
import { clearFurnitureSelectionIfClick } from './interaction/useFloorDeselect'
import { preferTransformHandles } from './interaction/handleRaycast'

export function ThreeDView() {
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  const polygons = useActiveFloorPolygons()
  const { walls, vertices } = useActiveWalls()
  const furniture = useActiveFurniture()
  const hasFloors = polygons.length > 0
  const furnitureHeight = maxFurnitureHeightScene(furniture)
  const frame = useMemo(() => {
    const wallPoints = wallEndpointPoints(walls, vertices)
    const sources: Point[][] = [...polygons]
    if (wallPoints.length > 0) sources.push(wallPoints)
    const bounds = boundsOfPolygons(sources)
    const height = Math.max(maxWallHeightScene(walls), furnitureHeight)
    return bounds ? cameraFrameFromBounds(bounds, height) : DEFAULT_CAMERA_FRAME
  }, [polygons, walls, vertices, furnitureHeight])

  return (
    <div className="absolute inset-0 z-10 h-full w-full overflow-hidden" style={{ background: SCENE_BACKGROUND }}>
      <Canvas
        key={`${projectId}:${layoutId}`}
        shadows
        dpr={[1, 1.75]}
        camera={{ position: frame.position, fov: 45, near: 0.1, far: frame.far }}
        onPointerMissed={clearFurnitureSelectionIfClick}
        onCreated={(state) => state.setEvents({ filter: preferTransformHandles })}
        gl={{ antialias: true, alpha: false }}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <color attach="background" args={[SCENE_BACKGROUND]} />
        <Scene frame={frame} />
      </Canvas>
      <ViewportChrome />
      {hasFloors ? null : (
        <p className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-[13px] text-ink-soft">
          No enclosed floor area yet.
        </p>
      )}
    </div>
  )
}

export default ThreeDView
