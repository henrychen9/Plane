import type { FurnitureItem } from '../../../types/spatial'
import { furnitureShapeOf } from '../../../furniture/shapes'
import { thinLiftInches } from '../furnitureGeometry'
import { inchesToSceneUnits } from '../../utils/units'
import { FurnitureBox, FurnitureCylinder } from '../primitives'

export function Rug3D({ item }: { item: FurnitureItem }) {
  const lift = thinLiftInches(item)
  const height = Math.max(item.height, 0.4)
  const shape = furnitureShapeOf(item)
  const y = inchesToSceneUnits(lift + height / 2)
  const round = shape === 'circle' || shape === 'oval'

  if (round) {
    const minSide = Math.min(item.width, item.depth)
    return (
      <FurnitureCylinder
        position={[0, y, 0]}
        radius={inchesToSceneUnits(minSide / 2)}
        height={inchesToSceneUnits(height)}
        scale={[item.width / minSide, 1, item.depth / minSide]}
        color={item.color}
        preset="rug"
        radialSegments={40}
        castShadow={false}
      />
    )
  }

  return (
    <FurnitureBox
      position={[0, y, 0]}
      size={[inchesToSceneUnits(item.width), inchesToSceneUnits(height), inchesToSceneUnits(item.depth)]}
      color={item.color}
      preset="rug"
      castShadow={false}
    />
  )
}
