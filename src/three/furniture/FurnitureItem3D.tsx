import { memo, Suspense, useMemo } from 'react'
import type { FurnitureItem } from '../../types/spatial'
import { furnitureSnapshot, furnitureWorldTransform } from './furnitureGeometry'
import { FurnitureErrorBoundary } from './models/FurnitureErrorBoundary'
import { ModelFurniture3D } from './models/ModelFurniture3D'
import { ProceduralFurniture3D } from './procedural/ProceduralFurniture3D'
import { listedModelPaths, resolveFurnitureRender } from './registry/furnitureRegistry'
import { furnitureModelUrl } from './models/modelUtils'
import { useGLTF } from '@react-three/drei'
import { FurnitureDragController } from '../interaction/FurnitureDragController'

for (const path of listedModelPaths()) {
  useGLTF.preload(furnitureModelUrl(path))
}

function FurnitureVisual({ item }: { item: FurnitureItem }) {
  const definition = resolveFurnitureRender(item)
  const procedural = <ProceduralFurniture3D item={item} kind={definition.proceduralType} />

  if (definition.renderer !== 'model' || !definition.modelPath) return procedural

  const resetKey = `${item.id}:${definition.modelPath}`
  return (
    <FurnitureErrorBoundary resetKey={resetKey} fallback={procedural}>
      <Suspense fallback={procedural}>
        <ModelFurniture3D
          item={item}
          modelPath={definition.modelPath}
          rotationOffsetY={definition.rotationOffsetY ?? 0}
        />
      </Suspense>
    </FurnitureErrorBoundary>
  )
}

export const FurnitureItem3D = memo(
  function FurnitureItem3D({ item, selected }: { item: FurnitureItem; selected: boolean }) {
    const snapshot = furnitureSnapshot(item)
    const transform = useMemo(() => furnitureWorldTransform(item), [snapshot, item])

    return (
      <group
        position={transform.position}
        rotation={transform.rotation}
        userData={{ furnitureId: item.id }}
      >
        <FurnitureDragController item={item} selected={selected}>
          <FurnitureVisual item={item} />
        </FurnitureDragController>
      </group>
    )
  },
  (prev, next) =>
    furnitureSnapshot(prev.item) === furnitureSnapshot(next.item) && prev.selected === next.selected,
)
