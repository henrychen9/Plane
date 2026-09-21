import { darken, lighten } from '../../../utils/color'
import type { FurnitureItem } from '../../../types/spatial'
import { furnitureShapeOf } from '../../../furniture/shapes'
import { inchesToSceneUnits } from '../../utils/units'
import { FurnitureCylinder } from '../primitives'
import { BoxPart } from './BoxPart'

export function Table3D({ item }: { item: FurnitureItem }) {
  const shape = furnitureShapeOf(item)
  const topH = Math.min(1.7, Math.max(1.1, item.height * 0.07))
  const topColor = lighten(item.color, 0.05)
  const wood = darken(item.color, 0.2)
  const round = shape === 'circle' || shape === 'oval'

  if (round) {
    const minSide = Math.min(item.width, item.depth)
    const radius = inchesToSceneUnits(minSide / 2)
    const scale: [number, number, number] = [item.width / minSide, 1, item.depth / minSide]
    const pedestalH = inchesToSceneUnits(Math.max(item.height - topH, 1))
    return (
      <>
        <FurnitureCylinder
          position={[0, inchesToSceneUnits(item.height - topH / 2), 0]}
          radius={radius}
          height={inchesToSceneUnits(topH)}
          scale={scale}
          color={topColor}
          preset="wood"
          radialSegments={shape === 'oval' ? 36 : 32}
        />
        <FurnitureCylinder
          position={[0, pedestalH / 2, 0]}
          radius={radius * 0.11}
          height={pedestalH}
          color={wood}
          preset="wood"
        />
        <FurnitureCylinder
          position={[0, inchesToSceneUnits(0.7), 0]}
          radius={radius * 0.28}
          height={inchesToSceneUnits(1.3)}
          color={wood}
          preset="wood"
        />
      </>
    )
  }

  const inset = Math.max(2.2, Math.min(item.width, item.depth) * 0.06)
  const leg = Math.max(3.1, Math.min(item.width, item.depth) * 0.085)
  const legH = Math.max(item.height - topH, 1)
  const corners = [
    { x: inset, y: inset },
    { x: item.width - inset - leg, y: inset },
    { x: inset, y: item.depth - inset - leg },
    { x: item.width - inset - leg, y: item.depth - inset - leg },
  ]

  return (
    <>
      <BoxPart
        item={item}
        box={{ x: 0, y: 0, width: item.width, depth: item.depth, height: topH, bottom: item.height - topH }}
        color={topColor}
        preset="wood"
      />
      {corners.map((corner, index) => (
        <BoxPart
          key={index}
          item={item}
          box={{ x: corner.x, y: corner.y, width: leg, depth: leg, height: legH }}
          color={wood}
          preset="wood"
        />
      ))}
    </>
  )
}
