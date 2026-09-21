import { memo } from 'react'
import type Konva from 'konva'
import { Group, Line, Text } from 'react-konva'
import { projectOnWall, wallLength, wallNormal } from '../architecture/geometry'
import { pickMountedAt } from '../architecture/pick'
import { splitWallAt, translateWall } from '../architecture/plan'
import { wallHasSharedEndpoints } from '../architecture/vertices'
import { wallPolygon } from '../architecture/wallPolygons'
import { useEditorStore } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'
import type { FloorPlan, Wall } from '../types/spatial'
import { formatLength } from '../utils/units'
import { beginRigidGroupDrag, canRigidGroupDrag, hasActiveGroupDrag } from './groupDrag'
import { beginMountedDrag } from './mountedDrag'
import { pointerToWorld } from './pointer'

export const WallNode = memo(function WallNode({
  projectId,
  layoutId,
  wall,
  plan,
  selected,
  interactive,
  locked,
  scale,
}: {
  projectId: string
  layoutId: string
  wall: Wall
  plan: FloorPlan
  selected: boolean
  interactive: boolean
  locked: boolean
  scale: number
}) {
  const inv = 1 / scale
  const draggingOpeningId = useEditorStore((state) => state.draggingOpeningId)
  const selections = useEditorStore((state) => state.selections)
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const selectObject = useEditorStore((state) => state.selectObject)
  const updatePlan = useProjectStore((state) => state.updatePlan)
  const points = wallPolygon(plan, wall)
  const mid = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 }
  const normal = wallNormal(wall)
  const showLength = plan.showWallLengths ?? true
  const labelPos = {
    x: mid.x + normal.x * (wall.thickness * 0.7 + 6 * inv),
    y: mid.y + normal.y * (wall.thickness * 0.7 + 6 * inv),
  }
  const shared = wallHasSharedEndpoints(plan, wall)
  const inRigidGroup = selected && canRigidGroupDrag(selections)
  const openingHost =
    plan.doors.some((item) => item.id === draggingOpeningId && item.wallId === wall.id) ||
    plan.windows.some((item) => item.id === draggingOpeningId && item.wallId === wall.id)
  const highlighted = selected || openingHost
  const bodyDraggable = interactive && !locked && !shared && !inRigidGroup

  const select = (additive = false) => selectObject({ kind: 'wall', id: wall.id }, additive)

  const takeMountedIfHit = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (!interactive) return false
    const stage = event.target.getStage()
    const world = stage ? pointerToWorld(stage, event.evt) : null
    if (!world) return false
    const mounted = pickMountedAt(world, plan, Math.max(10, wall.thickness))
    if (!mounted) return false
    event.cancelBubble = true
    event.target.stopDrag()
    beginMountedDrag({
      projectId,
      layoutId,
      kind: mounted.kind,
      id: mounted.id,
      stage,
      additive: event.evt.shiftKey,
      locked,
    })
    return true
  }

  const onBodyMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (takeMountedIfHit(event)) return
    if (!interactive) return
    event.cancelBubble = true
    if (event.evt.shiftKey) {
      select(true)
      return
    }
    if (inRigidGroup) {
      beginRigidGroupDrag({ projectId, layoutId, stage: event.target.getStage() })
      return
    }
    select()
  }

  return (
    <Group>
      {points.length >= 8 ? (
        <Line
          points={points}
          closed
          fill={highlighted ? '#2c2a26' : '#3f3c37'}
          strokeEnabled={false}
          perfectDrawEnabled={false}
          onMouseDown={onBodyMouseDown}
          onDblClick={(event) => {
            if (!interactive || locked || inRigidGroup) return
            const stage = event.target.getStage()
            const pointer = stage?.getPointerPosition()
            if (!stage || !pointer) return
            const world = {
              x: (pointer.x - stage.x()) / stage.scaleX(),
              y: (pointer.y - stage.y()) / stage.scaleY(),
            }
            const hit = projectOnWall(world, wall)
            captureHistory()
            updatePlan(projectId, layoutId, (current) => splitWallAt(current, wall.id, hit.offset))
          }}
          onContextMenu={(event) => {
            event.evt.preventDefault()
            event.cancelBubble = true
            const stage = event.target.getStage()
            const pointer = stage?.getPointerPosition()
            const world = pointer && stage
              ? { x: (pointer.x - stage.x()) / stage.scaleX(), y: (pointer.y - stage.y()) / stage.scaleY() }
              : mid
            select()
            setContextMenu({
              clientX: event.evt.clientX,
              clientY: event.evt.clientY,
              selection: { kind: 'wall', id: wall.id },
              world,
            })
          }}
          draggable={bodyDraggable}
          onDragStart={(event) => {
            if (useEditorStore.getState().draggingOpeningId || hasActiveGroupDrag() || inRigidGroup) {
              event.target.stopDrag()
              event.target.position({ x: 0, y: 0 })
              return
            }
            event.cancelBubble = true
            captureHistory()
            if (!event.evt.shiftKey) select()
          }}
          onDragMove={(event) => {
            if (hasActiveGroupDrag() || inRigidGroup) {
              event.target.position({ x: 0, y: 0 })
              return
            }
            const node = event.target
            updatePlan(projectId, layoutId, (current) => translateWall(current, wall.id, node.x(), node.y()), {
              rebuild: false,
            })
            node.position({ x: 0, y: 0 })
          }}
          onDragEnd={() => {
            updatePlan(projectId, layoutId, (current) => current)
          }}
        />
      ) : (
        <Line
          points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
          stroke={highlighted ? '#2c2a26' : '#3f3c37'}
          strokeWidth={wall.thickness}
          lineCap="butt"
          lineJoin="miter"
          miterLimit={4}
          onMouseDown={onBodyMouseDown}
        />
      )}
      {showLength ? (
        <Text
          x={labelPos.x - 36}
          y={labelPos.y - 6 * inv}
          width={72}
          align="center"
          text={formatLength(wallLength(wall))}
          fontSize={10 * inv}
          fontFamily="Inter Tight"
          fill="#8d877e"
          listening={false}
        />
      ) : null}
    </Group>
  )
})
