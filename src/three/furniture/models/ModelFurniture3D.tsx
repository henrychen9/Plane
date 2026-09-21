import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import type { FurnitureItem } from '../../../types/spatial'
import { furnitureModelUrl, normalizeModelToItem } from './modelUtils'

export function ModelFurniture3D({
  item,
  modelPath,
  rotationOffsetY = 0,
}: {
  item: FurnitureItem
  modelPath: string
  rotationOffsetY?: number
}) {
  const url = furnitureModelUrl(modelPath)
  const gltf = useGLTF(url)
  const prepared = useMemo(() => {
    const cloned = SkeletonUtils.clone(gltf.scene)
    normalizeModelToItem(cloned, item)
    return cloned
  }, [gltf.scene, item.width, item.depth, item.height, item.color])

  return (
    <group rotation={[0, rotationOffsetY, 0]}>
      <primitive object={prepared} dispose={null} />
    </group>
  )
}
