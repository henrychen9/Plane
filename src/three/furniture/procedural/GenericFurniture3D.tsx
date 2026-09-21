import { lighten } from '../../../utils/color'
import type { FurnitureItem } from '../../../types/spatial'
import { furnitureShapeOf } from '../../../furniture/shapes'
import { fullItemBox, thinLiftInches } from '../furnitureGeometry'
import { inchesToSceneUnits } from '../../utils/units'
import { FurnitureBox, FurnitureCylinder } from '../primitives'

export function GenericFurniture3D({ item }: { item: FurnitureItem }) {
  const shape = furnitureShapeOf(item)
  const lift = thinLiftInches(item)

  if (shape === 'circle' || shape === 'oval') {
    const minSide = Math.min(item.width, item.depth)
    const height = inchesToSceneUnits(Math.max(item.height, 0.35))
    return (
      <FurnitureCylinder
        position={[0, inchesToSceneUnits(lift) + height / 2, 0]}
        radius={inchesToSceneUnits(minSide / 2)}
        height={height}
        scale={[item.width / minSide, 1, item.depth / minSide]}
        color={item.color}
        preset="wood"
        castShadow={!lift}
      />
    )
  }

  const box = fullItemBox(item, lift)
  return (
    <>
      <FurnitureBox
        position={box.position}
        size={box.size}
        color={item.color}
        preset="wood"
        castShadow={!lift}
      />
      <FurnitureBox
        position={[box.position[0], inchesToSceneUnits(item.height - 0.4), box.position[2]]}
        size={[inchesToSceneUnits(item.width), inchesToSceneUnits(0.5), inchesToSceneUnits(item.depth)]}
        color={lighten(item.color, 0.06)}
        preset="wood"
        castShadow={false}
      />
    </>
  )
}
