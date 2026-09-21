import { darken, lighten } from '../../../utils/color'
import type { FurnitureItem } from '../../../types/spatial'
import { inchesToSceneUnits } from '../../utils/units'
import { FurnitureBox } from '../primitives'
import { BoxPart } from './BoxPart'

export function Chair3D({ item, office = false }: { item: FurnitureItem; office?: boolean }) {
  const h = Math.max(item.height, 18)
  const seatH = Math.max(1.7, Math.min(2.6, h * 0.075))
  const seatBottom = h * 0.44
  const backThickness = Math.max(1.2, Math.min(1.8, item.depth * 0.09))
  const sideInset = Math.max(1.35, item.width * 0.1)
  const frontInset = Math.max(1.35, item.depth * 0.09)
  const recline = office ? -0.12 : -0.09
  const backH = h - seatBottom
  const rearInset = Math.max(1.5, Math.abs(Math.sin(recline)) * backH + 0.3)
  const leg = Math.max(1.25, Math.min(item.width, item.depth) * 0.09)
  const wood = darken(item.color, office ? 0.22 : 0.14)
  const backW = item.width - sideInset * 2
  const seatFront = item.depth - frontInset * 0.35
  const seatRear = rearInset + backThickness * 0.45
  const seatDepth = Math.max(4, seatFront - seatRear)

  return (
    <>
      {[
        { x: sideInset, y: rearInset },
        { x: item.width - sideInset - leg, y: rearInset },
        { x: sideInset, y: item.depth - frontInset - leg },
        { x: item.width - sideInset - leg, y: item.depth - frontInset - leg },
      ].map((corner, index) => (
        <BoxPart
          key={index}
          item={item}
          box={{ x: corner.x, y: corner.y, width: leg, depth: leg, height: seatBottom }}
          color={wood}
          preset={office ? 'metal' : 'wood'}
        />
      ))}
      <BoxPart
        item={item}
        box={{
          x: sideInset * 0.45,
          y: seatRear,
          width: item.width - sideInset * 0.9,
          depth: seatDepth,
          height: seatH,
          bottom: seatBottom,
        }}
        color={lighten(item.color, office ? 0.02 : 0.1)}
        preset="fabric"
      />
      <group
        position={[
          0,
          inchesToSceneUnits(seatBottom),
          inchesToSceneUnits(rearInset + backThickness * 0.5 - item.depth / 2),
        ]}
        rotation={[recline, 0, 0]}
      >
        <FurnitureBox
          position={[0, inchesToSceneUnits(backH / 2), 0]}
          size={[inchesToSceneUnits(backW), inchesToSceneUnits(backH), inchesToSceneUnits(backThickness)]}
          color={item.color}
          preset="fabric"
        />
      </group>
    </>
  )
}
