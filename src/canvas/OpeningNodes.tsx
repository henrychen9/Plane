import { Circle, Group, Line, Rect, Text } from 'react-konva'
import { pointAlongWall, wallAngle, wallLength, wallNormal } from '../architecture/geometry'
import { doorGeometry, windowGeometry } from '../architecture/openings'
import { useEditorStore } from '../state/editorStore'
import type { Door, FloorPlan, Outlet, Point, SwitchDevice, WindowOpening } from '../types/spatial'
import { formatLength } from '../utils/units'
import { beginMountedDrag } from './mountedDrag'

function hitWidth(scale: number, thickness: number) {
  const inv = 1 / scale
  return Math.max(thickness + 6, 12, 16 * inv)
}

export function DoorNode({
  projectId,
  layoutId,
  door,
  plan,
  selected,
  interactive,
  locked,
  scale,
}: {
  projectId: string
  layoutId: string
  door: Door
  plan: FloorPlan
  selected: boolean
  interactive: boolean
  locked: boolean
  scale: number
}) {
  const wall = plan.walls.find((item) => item.id === door.wallId)
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  const draggingOpeningId = useEditorStore((state) => state.draggingOpeningId)
  if (!wall) return null
  const inv = 1 / scale
  const geo = doorGeometry(wall, door)
  const dragging = draggingOpeningId === door.id
  const color = selected || dragging ? '#2c2a26' : '#4a4742'
  const mid = pointAlongWall(wall, door.offset + door.width / 2)
  const distStart = door.offset
  const distEnd = wallLength(wall) - door.offset - door.width
  const nearest = Math.min(distStart, distEnd)
  const pad = hitWidth(scale, wall.thickness)
  const sector = [geo.hinge.x, geo.hinge.y, ...geo.arc.flatMap((point) => [point.x, point.y])]

  return (
    <Group
      onMouseDown={(event) => {
        if (!interactive) return
        event.cancelBubble = true
        if (event.evt.button !== 0) return
        beginMountedDrag({
          projectId,
          layoutId,
          kind: 'door',
          id: door.id,
          stage: event.target.getStage(),
          additive: event.evt.shiftKey,
          locked,
        })
      }}
      onContextMenu={(event) => {
        event.evt.preventDefault()
        event.cancelBubble = true
        useEditorStore.getState().selectObject({ kind: 'door', id: door.id })
        setContextMenu({
          clientX: event.evt.clientX,
          clientY: event.evt.clientY,
          selection: { kind: 'door', id: door.id },
          world: geo.hinge,
        })
      }}
    >
      <Line
        points={[geo.gapStart.x, geo.gapStart.y, geo.gapEnd.x, geo.gapEnd.y]}
        stroke="#ece6db"
        strokeWidth={wall.thickness + 0.4}
        hitStrokeWidth={pad}
        listening={false}
      />
      {door.type === 'hinged' ? (
        <>
          <Line
            points={[geo.hinge.x, geo.hinge.y, geo.slab.x, geo.slab.y]}
            stroke={color}
            strokeWidth={selected ? 1.45 * inv : 1.15 * inv}
            listening={false}
          />
          <Line
            points={geo.arc.flatMap((point) => [point.x, point.y])}
            stroke={color}
            strokeWidth={selected ? 1.15 * inv : 0.9 * inv}
            dash={[2.4 * inv, 1.8 * inv]}
            listening={false}
          />
        </>
      ) : (
        <Line
          points={[geo.gapStart.x, geo.gapStart.y, geo.gapEnd.x, geo.gapEnd.y]}
          stroke={color}
          strokeWidth={1.2 * inv}
          dash={door.type === 'pocket' ? [3 * inv, 2 * inv] : undefined}
          listening={false}
        />
      )}
      <Line
        points={[geo.gapStart.x, geo.gapStart.y, geo.gapEnd.x, geo.gapEnd.y]}
        stroke="transparent"
        strokeWidth={pad}
        hitStrokeWidth={pad}
      />
      {door.type === 'hinged' && sector.length >= 6 ? (
        <Line points={sector} closed fill="rgba(0,0,0,0.01)" strokeEnabled={false} />
      ) : null}
      {selected ? (
        <Circle x={geo.hinge.x} y={geo.hinge.y} radius={2.4 * inv} fill="#2c2a26" listening={false} />
      ) : null}
      {dragging ? (
        <Text
          x={mid.x - 48}
          y={mid.y - 16 * inv}
          width={96}
          align="center"
          text={`${formatLength(nearest)} from end`}
          fontSize={10 * inv}
          fontFamily="Inter Tight"
          fill="#6f6a63"
          listening={false}
        />
      ) : null}
    </Group>
  )
}

export function WindowNode({
  projectId,
  layoutId,
  window,
  plan,
  selected,
  interactive,
  locked,
  scale,
}: {
  projectId: string
  layoutId: string
  window: WindowOpening
  plan: FloorPlan
  selected: boolean
  interactive: boolean
  locked: boolean
  scale: number
}) {
  const wall = plan.walls.find((item) => item.id === window.wallId)
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  if (!wall) return null
  const inv = 1 / scale
  const geo = windowGeometry(wall, window)
  const mid = { x: (geo.start.x + geo.end.x) / 2, y: (geo.start.y + geo.end.y) / 2 }
  const color = selected ? '#2c2a26' : '#6a655e'
  const pad = hitWidth(scale, wall.thickness)

  return (
    <Group
      onMouseDown={(event) => {
        if (!interactive) return
        event.cancelBubble = true
        if (event.evt.button !== 0) return
        beginMountedDrag({
          projectId,
          layoutId,
          kind: 'window',
          id: window.id,
          stage: event.target.getStage(),
          additive: event.evt.shiftKey,
          locked,
        })
      }}
      onContextMenu={(event) => {
        event.evt.preventDefault()
        event.cancelBubble = true
        useEditorStore.getState().selectObject({ kind: 'window', id: window.id })
        setContextMenu({
          clientX: event.evt.clientX,
          clientY: event.evt.clientY,
          selection: { kind: 'window', id: window.id },
          world: mid,
        })
      }}
    >
      <Line
        points={[geo.start.x, geo.start.y, geo.end.x, geo.end.y]}
        stroke="#ece6db"
        strokeWidth={wall.thickness + 0.4}
        listening={false}
      />
      <Line
        points={[geo.inner[0].x, geo.inner[0].y, geo.inner[1].x, geo.inner[1].y]}
        stroke={color}
        strokeWidth={1 * inv}
        listening={false}
      />
      <Line
        points={[geo.outer[0].x, geo.outer[0].y, geo.outer[1].x, geo.outer[1].y]}
        stroke={color}
        strokeWidth={1 * inv}
        listening={false}
      />
      <Line
        points={[geo.start.x, geo.start.y, geo.end.x, geo.end.y]}
        stroke={color}
        strokeWidth={selected ? 1 * inv : 0.7 * inv}
        listening={false}
      />
      <Line
        points={[geo.start.x, geo.start.y, geo.end.x, geo.end.y]}
        stroke="transparent"
        strokeWidth={pad}
        hitStrokeWidth={pad}
      />
    </Group>
  )
}

export function MarkerNode({
  projectId,
  layoutId,
  kind,
  item,
  plan,
  selected,
  interactive,
  locked,
  scale,
}: {
  projectId: string
  layoutId: string
  kind: 'outlet' | 'switch'
  item: Outlet | SwitchDevice
  plan: FloorPlan
  selected: boolean
  interactive: boolean
  locked: boolean
  scale: number
}) {
  const wall = plan.walls.find((entry) => entry.id === item.wallId)
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  if (!wall) return null
  const inv = 1 / scale
  const pos = pointAlongWall(wall, item.offset)
  const normal = wallNormal(wall)
  const outward = {
    x: pos.x + normal.x * (wall.thickness * 0.5 + 3.2 * inv),
    y: pos.y + normal.y * (wall.thickness * 0.5 + 3.2 * inv),
  }
  const radius = Math.max(8, 14 * inv)

  return (
    <Group
      x={outward.x}
      y={outward.y}
      rotation={wallAngle(wall)}
      onMouseDown={(event) => {
        if (!interactive) return
        event.cancelBubble = true
        if (event.evt.button !== 0) return
        beginMountedDrag({
          projectId,
          layoutId,
          kind,
          id: item.id,
          stage: event.target.getStage(),
          additive: event.evt.shiftKey,
          locked,
        })
      }}
      onContextMenu={(event) => {
        event.evt.preventDefault()
        event.cancelBubble = true
        useEditorStore.getState().selectObject({ kind, id: item.id })
        setContextMenu({
          clientX: event.evt.clientX,
          clientY: event.evt.clientY,
          selection: { kind, id: item.id },
          world: outward,
        })
      }}
    >
      <Circle radius={radius} fill="rgba(0,0,0,0.01)" />
      {kind === 'outlet' ? (
        <>
          <Circle radius={2.6 * inv} fill="#f7f4ef" stroke={selected ? '#2c2a26' : '#5c5852'} strokeWidth={0.9 * inv} />
          <Line points={[-1.1 * inv, -0.7 * inv, -1.1 * inv, 0.7 * inv]} stroke="#5c5852" strokeWidth={0.7 * inv} />
          <Line points={[1.1 * inv, -0.7 * inv, 1.1 * inv, 0.7 * inv]} stroke="#5c5852" strokeWidth={0.7 * inv} />
        </>
      ) : (
        <>
          <Rect
            x={-2.2 * inv}
            y={-2.2 * inv}
            width={4.4 * inv}
            height={4.4 * inv}
            fill="#f7f4ef"
            stroke={selected ? '#2c2a26' : '#5c5852'}
            strokeWidth={0.9 * inv}
          />
          <Line points={[0, -1.2 * inv, 0, 1.2 * inv]} stroke="#5c5852" strokeWidth={0.8 * inv} />
        </>
      )}
    </Group>
  )
}

export function MeasureLine({
  start,
  end,
  scale,
  selected,
  onSelect,
}: {
  start: Point
  end: Point
  scale: number
  selected?: boolean
  onSelect?: () => void
}) {
  const inv = 1 / scale
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
  const length = Math.hypot(end.x - start.x, end.y - start.y)
  return (
    <Group
      onMouseDown={(event) => {
        event.cancelBubble = true
        onSelect?.()
      }}
    >
      <Line points={[start.x, start.y, end.x, end.y]} stroke={selected ? '#2c2a26' : '#7b93a6'} strokeWidth={1 * inv} />
      <Circle x={start.x} y={start.y} radius={2.2 * inv} fill="#7b93a6" />
      <Circle x={end.x} y={end.y} radius={2.2 * inv} fill="#7b93a6" />
      <Line
        points={[start.x, start.y, end.x, end.y]}
        stroke="transparent"
        strokeWidth={10 * inv}
      />
      <Text
        x={mid.x - 40}
        y={mid.y - 12 * inv}
        width={80}
        align="center"
        text={formatLength(length)}
        fontSize={11 * inv}
        fontFamily="Inter Tight"
        fill="#5d6f7e"
        listening={false}
      />
    </Group>
  )
}
