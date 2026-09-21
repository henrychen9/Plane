import { darken, lighten } from '../../../utils/color'
import type { FurnitureItem } from '../../../types/spatial'
import { furnitureShapeOf, lShapeThickness } from '../../../furniture/shapes'
import { inchesToSceneUnits } from '../../utils/units'
import { lShapeBoxes } from '../furnitureGeometry'
import { FurnitureCylinder } from '../primitives'
import { BoxPart } from './BoxPart'

function RectLegs({ item, topH, color }: { item: FurnitureItem; topH: number; color: string }) {
  const inset = Math.max(1.6, Math.min(item.width, item.depth) * 0.07)
  const leg = Math.max(1.5, Math.min(item.width, item.depth) * 0.045)
  const legH = Math.max(item.height - topH, 1)
  const corners = [
    { x: inset, y: inset },
    { x: item.width - inset - leg, y: inset },
    { x: inset, y: item.depth - inset - leg },
    { x: item.width - inset - leg, y: item.depth - inset - leg },
  ]
  return (
    <>
      {corners.map((corner, index) => (
        <BoxPart
          key={index}
          item={item}
          box={{ x: corner.x, y: corner.y, width: leg, depth: leg, height: legH }}
          color={color}
          preset="wood"
        />
      ))}
    </>
  )
}

export function Desk3D({ item }: { item: FurnitureItem }) {
  const shape = furnitureShapeOf(item)
  const topH = Math.min(1.8, Math.max(1.15, item.height * 0.06))
  const topColor = lighten(item.color, 0.06)
  const wood = darken(item.color, 0.18)

  if (shape === 'circle') {
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
        />
        <FurnitureCylinder
          position={[0, pedestalH / 2, 0]}
          radius={radius * 0.12}
          height={pedestalH}
          color={wood}
          preset="wood"
        />
        <FurnitureCylinder
          position={[0, inchesToSceneUnits(0.6), 0]}
          radius={radius * 0.22}
          height={inchesToSceneUnits(1.2)}
          color={wood}
          preset="wood"
        />
      </>
    )
  }

  if (shape === 'lShape') {
    const pieces = lShapeBoxes(item)
    const thickness = lShapeThickness(item)
    const side = item.shapeData?.returnSide ?? 'left'
    const leg = Math.max(1.6, Math.min(item.width, item.depth) * 0.04)
    const inset = 2
    const legs =
      side === 'right'
        ? [
            { x: inset, y: inset },
            { x: item.width - inset - leg, y: inset },
            { x: item.width - inset - leg, y: item.depth - inset - leg },
            { x: item.width - thickness, y: thickness - leg },
          ]
        : [
            { x: inset, y: inset },
            { x: item.width - inset - leg, y: inset },
            { x: inset, y: item.depth - inset - leg },
            { x: thickness - leg, y: thickness },
          ]
    return (
      <>
        {pieces.map((piece, index) => (
          <BoxPart
            key={index}
            item={item}
            box={{ ...piece, height: topH, bottom: item.height - topH }}
            color={topColor}
            preset="wood"
          />
        ))}
        {legs.map((corner, index) => (
          <BoxPart
            key={`leg-${index}`}
            item={item}
            box={{ x: corner.x, y: corner.y, width: leg, depth: leg, height: item.height - topH }}
            color={wood}
            preset="wood"
          />
        ))}
        <BoxPart
          item={item}
          box={{
            x: side === 'right' ? item.width - thickness : 0,
            y: 0.4,
            width: thickness,
            depth: 0.7,
            height: (item.height - topH) * 0.62,
            bottom: (item.height - topH) * 0.12,
          }}
          color={darken(item.color, 0.08)}
          preset="wood"
        />
      </>
    )
  }

  return (
    <>
      <BoxPart
        item={item}
        box={{ x: 0, y: 0, width: item.width, depth: item.depth, height: topH, bottom: item.height - topH }}
        color={topColor}
        preset="wood"
      />
      <RectLegs item={item} topH={topH} color={wood} />
      <BoxPart
        item={item}
        box={{
          x: 2,
          y: 0.45,
          width: item.width - 4,
          depth: 0.7,
          height: (item.height - topH) * 0.58,
          bottom: (item.height - topH) * 0.14,
        }}
        color={darken(item.color, 0.08)}
        preset="wood"
      />
    </>
  )
}
