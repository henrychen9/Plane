import type Konva from 'konva'
import { memo } from 'react'
import { Ellipse, Group, Line, Rect } from 'react-konva'
import { furnitureDrawingFor } from '../furniture/drawings'
import { KonvaPrimitives } from '../furniture/FurnitureVisual'
import { furnitureShapeOf, lShapePoints } from '../furniture/shapes'
import { useEditorStore } from '../state/editorStore'
import type { FurnitureItem } from '../types/spatial'

type FurnitureNodeProps = {
  item: FurnitureItem
  dragging: boolean
  allowNodeDrag?: boolean
  onNode: (id: string, node: Konva.Group | null) => void
  onSelect: (id: string, toggle: boolean, cycle: boolean) => void
  onGroupDragStart?: (id: string, stage: Konva.Stage | null) => boolean
  onDragStart: (id: string, node: Konva.Group) => boolean | void
  onDragMove: (id: string, node: Konva.Group) => void
  onDragEnd: (id: string, node: Konva.Group) => void
}

export const FurnitureNode = memo(function FurnitureNode({
  item,
  dragging,
  allowNodeDrag,
  onNode,
  onSelect,
  onGroupDragStart,
  onDragStart,
  onDragMove,
  onDragEnd,
}: FurnitureNodeProps) {
  const shapes = furnitureDrawingFor(item)
  const shape = furnitureShapeOf(item)
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  const selectObject = useEditorStore((state) => state.selectObject)

  return (
    <Group
      name="furniture"
      ref={(node) => onNode(item.id, node)}
      x={item.x + item.width / 2}
      y={item.y + item.depth / 2}
      offsetX={item.width / 2}
      offsetY={item.depth / 2}
      rotation={item.rotation}
      draggable={allowNodeDrag ?? !item.locked}
      width={item.width}
      height={item.depth}
      scaleX={1}
      scaleY={1}
      shadowEnabled={dragging}
      shadowColor="#2c2a26"
      shadowBlur={dragging ? 18 : 0}
      shadowOpacity={dragging ? 0.18 : 0}
      shadowOffsetY={dragging ? 6 : 0}
      onMouseDown={(event) => {
        event.cancelBubble = true
        if (!event.evt.shiftKey && onGroupDragStart?.(item.id, event.target.getStage())) return
        onSelect(item.id, event.evt.shiftKey, event.evt.metaKey || event.evt.ctrlKey)
      }}
      onTap={() => onSelect(item.id, false, false)}
      onContextMenu={(event) => {
        event.evt.preventDefault()
        event.cancelBubble = true
        selectObject({ kind: 'furniture', id: item.id })
        setContextMenu({
          clientX: event.evt.clientX,
          clientY: event.evt.clientY,
          selection: { kind: 'furniture', id: item.id },
          world: { x: item.x, y: item.y },
        })
      }}
      onDragStart={(event) => {
        event.cancelBubble = true
        const allowed = onDragStart(item.id, event.target as Konva.Group)
        if (allowed === false) {
          event.target.stopDrag()
          event.target.position({ x: item.x + item.width / 2, y: item.y + item.depth / 2 })
        }
      }}
      onDragMove={(event) => onDragMove(item.id, event.target as Konva.Group)}
      onDragEnd={(event) => onDragEnd(item.id, event.target as Konva.Group)}
    >
      {shape === 'circle' || shape === 'oval' ? (
        <Ellipse
          x={item.width / 2}
          y={item.depth / 2}
          radiusX={item.width / 2}
          radiusY={item.depth / 2}
          fill="rgba(0,0,0,0.001)"
        />
      ) : shape === 'lShape' ? (
        <Line points={lShapePoints(item)} closed fill="rgba(0,0,0,0.001)" />
      ) : (
        <Rect width={item.width} height={item.depth} fill="rgba(0,0,0,0.001)" />
      )}
      <KonvaPrimitives shapes={shapes} />
    </Group>
  )
})
