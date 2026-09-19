import { getCatalogItem } from '../../catalog/furniture'
import type { Layout } from '../../types/spatial'
import { FurnitureMarks } from '../../furniture/FurnitureVisual'

export function FloorplanPreview({ layout }: { layout: Layout }) {
  const plan = layout.plan
  const furniture = layout.furniture
  const sorted = [...furniture].sort((a, b) => {
    const aRug = getCatalogItem(a.type)?.category === 'rugs' ? 0 : 1
    const bRug = getCatalogItem(b.type)?.category === 'rugs' ? 0 : 1
    return aRug - bRug
  })

  let minX = 0
  let minY = 0
  let maxX = layout.room.width
  let maxY = layout.room.depth
  for (const wall of plan?.walls ?? []) {
    minX = Math.min(minX, wall.start.x, wall.end.x)
    minY = Math.min(minY, wall.start.y, wall.end.y)
    maxX = Math.max(maxX, wall.start.x, wall.end.x)
    maxY = Math.max(maxY, wall.start.y, wall.end.y)
  }
  const pad = 8
  const width = Math.max(36, maxX - minX)
  const depth = Math.max(36, maxY - minY)

  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${width + pad * 2} ${depth + pad * 2}`}
      className="h-full w-full"
      aria-hidden
    >
      {(plan?.rooms ?? []).map((room) => (
        <polygon
          key={room.id}
          points={room.polygon.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="#ece6db"
        />
      ))}
      {(plan?.walls ?? []).map((wall) => (
        <line
          key={wall.id}
          x1={wall.start.x}
          y1={wall.start.y}
          x2={wall.end.x}
          y2={wall.end.y}
          stroke="#3f3c37"
          strokeWidth={wall.thickness}
          strokeLinecap="butt"
        />
      ))}
      {plan?.rooms.length ? null : (
        <rect
          x={0}
          y={0}
          width={layout.room.width}
          height={layout.room.depth}
          fill="#ece6db"
          stroke="#d4cdc1"
          strokeWidth={3}
        />
      )}
      {sorted.map((item) => {
        const renderer = getCatalogItem(item.type)?.renderer ?? 'generic'
        const cx = item.x + item.width / 2
        const cy = item.y + item.depth / 2
        return (
          <g
            key={item.id}
            transform={`translate(${cx} ${cy}) rotate(${item.rotation}) translate(${-item.width / 2} ${-item.depth / 2})`}
          >
            <FurnitureMarks
              renderer={renderer}
              width={item.width}
              depth={item.depth}
              color={item.color}
              shape={item.shape}
              shapeData={item.shapeData}
            />
          </g>
        )
      })}
    </svg>
  )
}
