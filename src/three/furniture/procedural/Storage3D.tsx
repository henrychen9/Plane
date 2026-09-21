import { darken, lighten } from '../../../utils/color'
import type { FurnitureItem } from '../../../types/spatial'
import { BoxPart } from './BoxPart'

export function Storage3D({
  item,
  variant = 'dresser',
}: {
  item: FurnitureItem
  variant?: 'dresser' | 'bookshelf' | 'nightstand'
}) {
  const carcass = darken(item.color, 0.06)
  const face = lighten(item.color, 0.04)
  const inset = Math.max(0.6, Math.min(item.width, item.depth) * 0.04)
  const faceGap = 0.2
  const faceD = Math.max(0.45, Math.min(0.75, item.depth * 0.05))
  const carcassDepth = Math.max(item.depth - faceD - faceGap, item.depth * 0.84)

  if (variant === 'bookshelf') {
    const shelves = Math.max(3, Math.min(6, Math.round(item.height / 14)))
    const board = Math.max(0.7, Math.min(item.width, item.depth) * 0.05)
    const frontClear = 0.22
    const innerDepth = Math.max(item.depth - board - frontClear, item.depth * 0.7)
    return (
      <>
        <BoxPart
          item={item}
          box={{ x: 0, y: 0, width: item.width, depth: board, height: item.height }}
          color={carcass}
          preset="wood"
        />
        <BoxPart
          item={item}
          box={{ x: 0, y: board, width: board, depth: item.depth - board, height: item.height }}
          color={carcass}
          preset="wood"
        />
        <BoxPart
          item={item}
          box={{
            x: item.width - board,
            y: board,
            width: board,
            depth: item.depth - board,
            height: item.height,
          }}
          color={carcass}
          preset="wood"
        />
        <BoxPart
          item={item}
          box={{ x: board, y: board, width: item.width - board * 2, depth: innerDepth, height: board }}
          color={carcass}
          preset="wood"
        />
        <BoxPart
          item={item}
          box={{
            x: board,
            y: board,
            width: item.width - board * 2,
            depth: innerDepth,
            height: board,
            bottom: item.height - board,
          }}
          color={carcass}
          preset="wood"
        />
        {Array.from({ length: shelves }, (_, index) => {
          const y = ((index + 1) / (shelves + 1)) * item.height
          return (
            <BoxPart
              key={index}
              item={item}
              box={{
                x: board,
                y: board,
                width: item.width - board * 2,
                depth: innerDepth,
                height: 0.7,
                bottom: y,
              }}
              color={darken(item.color, 0.16)}
              preset="wood"
            />
          )
        })}
      </>
    )
  }

  const drawers = variant === 'nightstand' ? 2 : Math.max(3, Math.min(5, Math.round(item.height / 8)))
  const gap = 0.55
  const usable = item.height - inset * 2 - gap * (drawers - 1)
  const drawerH = usable / drawers

  return (
    <>
      <BoxPart
        item={item}
        box={{ x: 0, y: 0, width: item.width, depth: carcassDepth, height: item.height }}
        color={carcass}
        preset="wood"
      />
      {Array.from({ length: drawers }, (_, index) => (
        <BoxPart
          key={index}
          item={item}
          box={{
            x: inset,
            y: carcassDepth + faceGap,
            width: item.width - inset * 2,
            depth: faceD,
            height: drawerH,
            bottom: inset + index * (drawerH + gap),
          }}
          color={face}
          preset="wood"
        />
      ))}
    </>
  )
}
