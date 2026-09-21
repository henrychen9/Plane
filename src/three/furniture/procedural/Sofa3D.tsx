import { darken, lighten } from '../../../utils/color'
import type { FurnitureItem } from '../../../types/spatial'
import { inchesToSceneUnits } from '../../utils/units'
import { BoxPart } from './BoxPart'

export function Sofa3D({ item, compact = false }: { item: FurnitureItem; compact?: boolean }) {
  const h = Math.max(item.height, 16)
  const footH = Math.min(3, h * 0.08)
  const armW = compact ? Math.max(4.5, item.width * 0.14) : Math.max(5, item.width * 0.09)
  const backD = Math.max(5.5, item.depth * (compact ? 0.26 : 0.2))
  const baseH = Math.max(4, h * 0.18)
  const seatH = Math.max(3.2, h * 0.16)
  const armH = h * (compact ? 0.78 : 0.7)
  const seatBottom = footH + baseH
  const cushionGap = 0.7
  const seam = 0.2
  const frontClear = 0.22
  const seatWidth = item.width - armW * 2
  const innerW = Math.max(4, seatWidth - seam * 2)
  const seats = compact ? 1 : item.width >= 78 ? 3 : item.width >= 50 ? 2 : 1
  const cushionW = (innerW - cushionGap * (seats - 1)) / seats
  const foot = Math.max(1.4, Math.min(item.width, item.depth) * 0.04)
  const soft = inchesToSceneUnits(0.85)
  const cushionR = inchesToSceneUnits(1.05)
  const seatDepth = Math.max(4, item.depth - backD - seam - frontClear)

  return (
    <>
      {[
        { x: armW * 0.35, y: backD * 0.4 },
        { x: item.width - armW * 0.35 - foot, y: backD * 0.4 },
        { x: armW * 0.35, y: item.depth - foot - 1.2 },
        { x: item.width - armW * 0.35 - foot, y: item.depth - foot - 1.2 },
      ].map((corner, index) => (
        <BoxPart
          key={index}
          item={item}
          box={{ x: corner.x, y: corner.y, width: foot, depth: foot, height: footH }}
          color={darken(item.color, 0.35)}
          preset="wood"
        />
      ))}
      <BoxPart
        item={item}
        box={{
          x: armW * 0.08,
          y: seam,
          width: item.width - armW * 0.16,
          depth: item.depth - frontClear - seam,
          height: baseH,
          bottom: footH,
        }}
        color={darken(item.color, 0.1)}
        preset="fabric"
        radius={soft}
      />
      <BoxPart
        item={item}
        box={{
          x: armW + seam,
          y: 0,
          width: seatWidth - seam * 2,
          depth: backD,
          height: h,
          bottom: footH,
        }}
        color={darken(item.color, 0.14)}
        preset="fabric"
        radius={soft}
      />
      <BoxPart
        item={item}
        box={{ x: 0, y: 0, width: armW, depth: item.depth, height: armH, bottom: footH }}
        color={item.color}
        preset="fabric"
        radius={soft}
      />
      <BoxPart
        item={item}
        box={{ x: item.width - armW, y: 0, width: armW, depth: item.depth, height: armH, bottom: footH }}
        color={item.color}
        preset="fabric"
        radius={soft}
      />
      {Array.from({ length: seats }, (_, index) => (
        <BoxPart
          key={`seat-${index}`}
          item={item}
          box={{
            x: armW + seam + index * (cushionW + cushionGap),
            y: backD + seam,
            width: cushionW,
            depth: seatDepth,
            height: seatH,
            bottom: seatBottom + 0.12,
          }}
          color={lighten(item.color, 0.1)}
          preset="fabric"
          radius={cushionR}
        />
      ))}
      {Array.from({ length: seats }, (_, index) => (
        <BoxPart
          key={`back-${index}`}
          item={item}
          box={{
            x: armW + seam + index * (cushionW + cushionGap),
            y: backD + seam,
            width: cushionW,
            depth: Math.max(3.2, backD * 0.42),
            height: h * 0.4,
            bottom: seatBottom + seatH * 0.42,
          }}
          color={lighten(item.color, 0.04)}
          preset="fabric"
          radius={cushionR}
        />
      ))}
    </>
  )
}
