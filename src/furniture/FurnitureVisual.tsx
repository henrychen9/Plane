import { Ellipse, Line, Rect } from 'react-konva'
import type { FurnitureItem, FurnitureRendererId, FurnitureShape } from '../types/spatial'
import { furnitureDrawing, type DrawPrimitive } from './drawings'

export function KonvaPrimitives({ shapes }: { shapes: DrawPrimitive[] }) {
  return shapes.map((shape, index) => {
    switch (shape.kind) {
      case 'rect':
        return (
          <Rect
            key={index}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            cornerRadius={shape.cornerRadius}
            opacity={shape.opacity ?? 1}
            listening={false}
            perfectDrawEnabled={false}
          />
        )
      case 'ellipse':
        return (
          <Ellipse
            key={index}
            x={shape.cx}
            y={shape.cy}
            radiusX={shape.rx}
            radiusY={shape.ry}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            opacity={shape.opacity ?? 1}
            listening={false}
            perfectDrawEnabled={false}
          />
        )
      case 'line':
        return (
          <Line
            key={index}
            points={shape.points}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            opacity={shape.opacity ?? 1}
            lineCap={shape.lineCap ?? 'butt'}
            listening={false}
            perfectDrawEnabled={false}
          />
        )
      case 'polygon':
        return (
          <Line
            key={index}
            points={shape.points}
            closed
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            opacity={shape.opacity ?? 1}
            listening={false}
            perfectDrawEnabled={false}
          />
        )
      default:
        return null
    }
  })
}

export function SvgPrimitives({ shapes }: { shapes: DrawPrimitive[] }) {
  return (
    <>
      {shapes.map((shape, index) => {
        switch (shape.kind) {
          case 'rect':
            return (
              <rect
                key={index}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={shape.fill ?? 'none'}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                rx={shape.cornerRadius}
                opacity={shape.opacity}
              />
            )
          case 'ellipse':
            return (
              <ellipse
                key={index}
                cx={shape.cx}
                cy={shape.cy}
                rx={shape.rx}
                ry={shape.ry}
                fill={shape.fill ?? 'none'}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                opacity={shape.opacity}
              />
            )
          case 'line':
            return (
              <line
                key={index}
                x1={shape.points[0]}
                y1={shape.points[1]}
                x2={shape.points[2]}
                y2={shape.points[3]}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                opacity={shape.opacity}
                strokeLinecap={shape.lineCap}
              />
            )
          case 'polygon':
            return (
              <polygon
                key={index}
                points={shape.points.reduce((acc, value, i) => {
                  const pair = i % 2 === 0 ? `${value}` : `,${value} `
                  return acc + pair
                }, '').trim()}
                fill={shape.fill ?? 'none'}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                opacity={shape.opacity}
              />
            )
          default:
            return null
        }
      })}
    </>
  )
}

export function FurnitureMarks({
  renderer,
  width,
  depth,
  color,
  shape,
  shapeData,
}: {
  renderer: FurnitureRendererId
  width: number
  depth: number
  color: string
  shape?: FurnitureShape
  shapeData?: FurnitureItem['shapeData']
}) {
  return (
    <SvgPrimitives
      shapes={furnitureDrawing(renderer, width, depth, color, shape ?? 'rectangle', shapeData)}
    />
  )
}

export function FurnitureSvg({
  renderer,
  width,
  depth,
  color,
  className,
  shape,
  shapeData,
}: {
  renderer: FurnitureRendererId
  width: number
  depth: number
  color: string
  className?: string
  shape?: FurnitureShape
  shapeData?: FurnitureItem['shapeData']
}) {
  const pad = Math.max(width, depth) * 0.06
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${depth + pad * 2}`}
      className={className}
      aria-hidden
    >
      <FurnitureMarks
        renderer={renderer}
        width={width}
        depth={depth}
        color={color}
        shape={shape}
        shapeData={shapeData}
      />
    </svg>
  )
}
