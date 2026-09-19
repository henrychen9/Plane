import type Konva from 'konva'
import { Circle, Group, Line, Rect, Text } from 'react-konva'
import { clampOffsetForOpening, pointAlongWall, projectOnWall, wallAngle, wallLength, wallNormal } from '../architecture/geometry'
import { doorGeometry, windowGeometry } from '../architecture/openings'
import { useEditorStore } from '../state/editorStore'
import { getLayout, useProjectStore } from '../state/projectStore'
import type { Door, FloorPlan, Outlet, Point, SwitchDevice, Wall, WindowOpening } from '../types/spatial'
import { formatLength } from '../utils/units'
import { startStageDrag, stageWorld } from './stageDrag'

function currentWall(projectId: string, layoutId: string, wallId: string, fallback: Wall): Wall {
  return getLayout(projectId, layoutId)?.plan.walls.find((item) => item.id === wallId) ?? fallback
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
  const selectObject = useEditorStore((state) => state.selectObject)
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const setDraggingOpeningId = useEditorStore((state) => state.setDraggingOpeningId)
  const draggingOpeningId = useEditorStore((state) => state.draggingOpeningId)
  const updatePlan = useProjectStore((state) => state.updatePlan)
  if (!wall) return null
  const inv = 1 / scale
  const geo = doorGeometry(wall, door)
  const dragging = draggingOpeningId === door.id
  const color = selected || dragging ? '#2c2a26' : '#4a4742'
  const mid = pointAlongWall(wall, door.offset + door.width / 2)
  const distStart = door.offset
  const distEnd = wallLength(wall) - door.offset - door.width
  const nearest = Math.min(distStart, distEnd)

  const select = (additive = false) => selectObject({ kind: 'door', id: door.id }, additive)

  const beginDrag = (stage: Konva.Stage | null) => {
    if (!interactive || locked || !stage) return
    captureHistory()
    setDraggingOpeningId(door.id)
    select()
    startStageDrag(
      stage,
      () => {
        const world = stageWorld(stage)
        if (!world) return
        const liveWall = currentWall(projectId, layoutId, door.wallId, wall)
        const hit = projectOnWall(world, liveWall)
        const offset = clampOffsetForOpening(hit.offset - door.width / 2, door.width, liveWall)
        updatePlan(
          projectId,
          layoutId,
          (current) => ({
            ...current,
            doors: current.doors.map((item) => (item.id === door.id ? { ...item, offset } : item)),
          }),
          { rebuild: false },
        )
      },
      () => setDraggingOpeningId(null),
    )
  }

  return (
    <Group
      onMouseDown={(event) => {
        if (!interactive) return
        event.cancelBubble = true
        select(event.evt.shiftKey)
        if (event.evt.button !== 0 || event.evt.shiftKey) return
        beginDrag(event.target.getStage())
      }}
      onContextMenu={(event) => {
        event.evt.preventDefault()
        event.cancelBubble = true
        select()
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
        hitStrokeWidth={Math.max(wall.thickness + 8 * inv, 14 * inv)}
      />
      {door.type === 'hinged' ? (
        <>
          <Line
            points={[geo.hinge.x, geo.hinge.y, geo.slab.x, geo.slab.y]}
            stroke={color}
            strokeWidth={selected ? 1.45 * inv : 1.15 * inv}
            hitStrokeWidth={10 * inv}
          />
          <Line
            points={geo.arc.flatMap((point) => [point.x, point.y])}
            stroke={color}
            strokeWidth={selected ? 1.15 * inv : 0.9 * inv}
            dash={[2.4 * inv, 1.8 * inv]}
            hitStrokeWidth={10 * inv}
          />
        </>
      ) : (
        <Line
          points={[geo.gapStart.x, geo.gapStart.y, geo.gapEnd.x, geo.gapEnd.y]}
          stroke={color}
          strokeWidth={1.2 * inv}
          dash={door.type === 'pocket' ? [3 * inv, 2 * inv] : undefined}
          hitStrokeWidth={10 * inv}
        />
      )}
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
  const selectObject = useEditorStore((state) => state.selectObject)
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const setDraggingOpeningId = useEditorStore((state) => state.setDraggingOpeningId)
  const updatePlan = useProjectStore((state) => state.updatePlan)
  if (!wall) return null
  const inv = 1 / scale
  const geo = windowGeometry(wall, window)
  const mid = { x: (geo.start.x + geo.end.x) / 2, y: (geo.start.y + geo.end.y) / 2 }
  const color = selected ? '#2c2a26' : '#6a655e'

  const select = (additive = false) => selectObject({ kind: 'window', id: window.id }, additive)

  return (
    <Group
      onMouseDown={(event) => {
        if (!interactive) return
        event.cancelBubble = true
        select(event.evt.shiftKey)
        if (locked || event.evt.button !== 0 || event.evt.shiftKey) return
        const stage = event.target.getStage()
        if (!stage) return
        captureHistory()
        setDraggingOpeningId(window.id)
        startStageDrag(
          stage,
          () => {
            const world = stageWorld(stage)
            if (!world) return
            const liveWall = currentWall(projectId, layoutId, window.wallId, wall)
            const hit = projectOnWall(world, liveWall)
            const offset = clampOffsetForOpening(hit.offset - window.width / 2, window.width, liveWall)
            updatePlan(
              projectId,
              layoutId,
              (current) => ({
                ...current,
                windows: current.windows.map((item) => (item.id === window.id ? { ...item, offset } : item)),
              }),
              { rebuild: false },
            )
          },
          () => setDraggingOpeningId(null),
        )
      }}
      onContextMenu={(event) => {
        event.evt.preventDefault()
        event.cancelBubble = true
        select()
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
        hitStrokeWidth={Math.max(wall.thickness + 8 * inv, 14 * inv)}
      />
      <Line
        points={[geo.inner[0].x, geo.inner[0].y, geo.inner[1].x, geo.inner[1].y]}
        stroke={color}
        strokeWidth={1 * inv}
        hitStrokeWidth={8 * inv}
      />
      <Line
        points={[geo.outer[0].x, geo.outer[0].y, geo.outer[1].x, geo.outer[1].y]}
        stroke={color}
        strokeWidth={1 * inv}
        hitStrokeWidth={8 * inv}
      />
      <Line
        points={[geo.start.x, geo.start.y, geo.end.x, geo.end.y]}
        stroke={color}
        strokeWidth={selected ? 1 * inv : 0.7 * inv}
        hitStrokeWidth={8 * inv}
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
  const selectObject = useEditorStore((state) => state.selectObject)
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const updatePlan = useProjectStore((state) => state.updatePlan)
  if (!wall) return null
  const inv = 1 / scale
  const pos = pointAlongWall(wall, item.offset)
  const normal = wallNormal(wall)
  const outward = {
    x: pos.x + normal.x * (wall.thickness * 0.5 + 3.2 * inv),
    y: pos.y + normal.y * (wall.thickness * 0.5 + 3.2 * inv),
  }

  const select = (additive = false) => selectObject({ kind, id: item.id }, additive)

  return (
    <Group
      x={outward.x}
      y={outward.y}
      rotation={wallAngle(wall)}
      onMouseDown={(event) => {
        if (!interactive) return
        event.cancelBubble = true
        select(event.evt.shiftKey)
        if (locked || event.evt.button !== 0 || event.evt.shiftKey) return
        const stage = event.target.getStage()
        if (!stage) return
        captureHistory()
        startStageDrag(
          stage,
          () => {
            const world = stageWorld(stage)
            if (!world) return
            const liveWall = currentWall(projectId, layoutId, item.wallId, wall)
            const hit = projectOnWall(world, liveWall)
            const offset = Math.max(2, Math.min(wallLength(liveWall) - 2, hit.offset))
            updatePlan(
              projectId,
              layoutId,
              (current) =>
                kind === 'outlet'
                  ? { ...current, outlets: current.outlets.map((entry) => (entry.id === item.id ? { ...entry, offset } : entry)) }
                  : { ...current, switches: current.switches.map((entry) => (entry.id === item.id ? { ...entry, offset } : entry)) },
              { rebuild: false },
            )
          },
          () => undefined,
        )
      }}
      onContextMenu={(event) => {
        event.evt.preventDefault()
        event.cancelBubble = true
        select()
        setContextMenu({
          clientX: event.evt.clientX,
          clientY: event.evt.clientY,
          selection: { kind, id: item.id },
          world: outward,
        })
      }}
    >
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
