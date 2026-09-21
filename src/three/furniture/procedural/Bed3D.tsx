import { darken, lighten } from '../../../utils/color'
import type { FurnitureItem } from '../../../types/spatial'
import { BoxPart } from './BoxPart'

export function Bed3D({ item }: { item: FurnitureItem }) {
  const h = Math.max(item.height, 8)
  const frameH = Math.max(4.5, h * 0.26)
  const mattressH = Math.max(4, h * 0.3)
  const duvetH = Math.max(1.2, h * 0.08)
  const pillowH = Math.max(3.5, h * 0.22)
  const headD = Math.max(3.2, Math.min(7, item.depth * 0.08))
  const inset = Math.max(1.2, Math.min(item.width, item.depth) * 0.03)
  const faceGap = 0.22
  const lift = 0.2
  const frontClear = 0.22
  const pillowD = Math.max(7, item.depth * 0.14)
  const pillowW = (item.width - inset * 4.4) / 2
  const frameY = headD + faceGap
  const frameDepth = Math.max(8, item.depth - frameY - frontClear)
  const mattressY = frameY + inset
  const mattressDepth = Math.max(6, frameDepth - inset * 2)
  const mattressBottom = frameH + lift
  const beddingBottom = mattressBottom + mattressH + lift
  const pillowY = frameY + inset
  const duvetY = pillowY + pillowD + faceGap
  const duvetDepth = Math.max(8, mattressY + mattressDepth - duvetY - inset)

  return (
    <>
      <BoxPart
        item={item}
        box={{ x: 0, y: 0, width: item.width, depth: headD, height: h }}
        color={darken(item.color, 0.22)}
        preset="wood"
      />
      <BoxPart
        item={item}
        box={{ x: 0, y: frameY, width: item.width, depth: frameDepth, height: frameH }}
        color={darken(item.color, 0.28)}
        preset="wood"
      />
      <BoxPart
        item={item}
        box={{
          x: inset,
          y: mattressY,
          width: item.width - inset * 2,
          depth: mattressDepth,
          height: mattressH,
          bottom: mattressBottom,
        }}
        color={lighten(item.color, 0.12)}
        preset="fabric"
      />
      <BoxPart
        item={item}
        box={{
          x: inset * 1.6,
          y: duvetY,
          width: item.width - inset * 3.2,
          depth: duvetDepth,
          height: duvetH,
          bottom: beddingBottom,
        }}
        color={lighten(item.color, 0.02)}
        preset="fabric"
      />
      <BoxPart
        item={item}
        box={{
          x: inset * 2,
          y: pillowY,
          width: pillowW,
          depth: pillowD,
          height: pillowH,
          bottom: beddingBottom,
        }}
        color={lighten(item.color, 0.24)}
        preset="fabric"
      />
      <BoxPart
        item={item}
        box={{
          x: item.width - inset * 2 - pillowW,
          y: pillowY,
          width: pillowW,
          depth: pillowD,
          height: pillowH,
          bottom: beddingBottom,
        }}
        color={lighten(item.color, 0.24)}
        preset="fabric"
      />
    </>
  )
}
