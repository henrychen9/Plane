import { memo } from 'react'
import { Circle, Group, Line, Text } from 'react-konva'
import { pointAlongWall, polygonCentroid } from '../architecture/geometry'
import { nearestWall } from '../architecture/plan'
import { cornerHubs } from '../architecture/wallPolygons'
import { isSelected, canRigidGroupDrag } from '../editor/selection'
import { useEditorStore } from '../state/editorStore'
import type { FloorPlan } from '../types/spatial'
import { FixtureNode } from './FixtureNode'
import { DoorNode, MarkerNode, MeasureLine, WindowNode } from './OpeningNodes'
import { WallNode } from './WallNode'
import { VertexHandles } from './VertexHandles'

export const ArchitectureLayer = memo(function ArchitectureLayer({
  projectId,
  layoutId,
  plan,
  scale,
}: {
  projectId: string
  layoutId: string
  plan: FloorPlan
  scale: number
}) {
  const tool = useEditorStore((state) => state.tool)
  const selections = useEditorStore((state) => state.selections)
  const layers = useEditorStore((state) => state.layers)
  const interactive = tool === 'select'
  const locked = Boolean(plan.architectureLocked)
  const showArch = layers.architecture
  const wallHover = tool === 'door' || tool === 'window' || tool === 'outlet' || tool === 'switch'
  const selectedWallIds = selections.filter((item) => item.kind === 'wall').map((item) => item.id)

  return (
    <Group listening={interactive || wallHover}>
      {showArch
        ? plan.rooms.map((room) => {
            const selected = isSelected(selections, 'room', room.id)
            return (
              <Group key={room.id}>
                <Line
                  name="room-fill"
                  points={room.polygon.flatMap((point) => [point.x, point.y])}
                  closed
                  fill={selected ? '#e7e0d3' : '#ece6db'}
                  strokeEnabled={false}
                  listening={false}
                />
              </Group>
            )
          })
        : null}

      {showArch
        ? plan.walls.map((wall) => (
            <WallNode
              key={wall.id}
              projectId={projectId}
              layoutId={layoutId}
              wall={wall}
              plan={plan}
              selected={isSelected(selections, 'wall', wall.id)}
              interactive={interactive}
              locked={locked || wall.locked}
              scale={scale}
            />
          ))
        : null}

      {showArch
        ? cornerHubs(plan, selectedWallIds).map((hub) => (
            <Line
              key={`hub-${hub.id}`}
              points={hub.points}
              closed
              fill={hub.selected ? '#2c2a26' : '#3f3c37'}
              strokeEnabled={false}
              listening={false}
              perfectDrawEnabled={false}
            />
          ))
        : null}

      {showArch
        ? plan.doors.map((door) => (
            <DoorNode
              key={door.id}
              projectId={projectId}
              layoutId={layoutId}
              door={door}
              plan={plan}
              selected={isSelected(selections, 'door', door.id)}
              interactive={interactive}
              locked={locked}
              scale={scale}
            />
          ))
        : null}

      {showArch
        ? plan.windows.map((window) => (
            <WindowNode
              key={window.id}
              projectId={projectId}
              layoutId={layoutId}
              window={window}
              plan={plan}
              selected={isSelected(selections, 'window', window.id)}
              interactive={interactive}
              locked={locked}
              scale={scale}
            />
          ))
        : null}

      {showArch && selectedWallIds.length > 0 && !canRigidGroupDrag(selections)
        ? selectedWallIds.map((wallId) => (
            <VertexHandles
              key={`verts-${wallId}`}
              projectId={projectId}
              layoutId={layoutId}
              plan={plan}
              wallId={wallId}
              locked={locked || Boolean(plan.walls.find((wall) => wall.id === wallId)?.locked)}
              scale={scale}
            />
          ))
        : null}

      {showArch
        ? plan.fixtures.map((fixture) => (
            <FixtureNode
              key={fixture.id}
              projectId={projectId}
              layoutId={layoutId}
              fixture={fixture}
              plan={plan}
              selected={isSelected(selections, 'fixture', fixture.id)}
              interactive={interactive}
              locked={locked}
              scale={scale}
            />
          ))
        : null}
    </Group>
  )
})

export const OverlayLayer = memo(function OverlayLayer({
  projectId,
  layoutId,
  plan,
  scale,
}: {
  projectId: string
  layoutId: string
  plan: FloorPlan
  scale: number
}) {
  const tool = useEditorStore((state) => state.tool)
  const selections = useEditorStore((state) => state.selections)
  const layers = useEditorStore((state) => state.layers)
  const setSelection = useEditorStore((state) => state.setSelection)
  const inv = 1 / scale
  const interactive = tool === 'select'
  const locked = Boolean(plan.architectureLocked)

  return (
    <Group listening={interactive}>
      {layers.architecture
        ? plan.rooms.map((room) => {
            const center = polygonCentroid(room.polygon)
            return (
              <Group key={`label-${room.id}`} listening={false}>
                <Text
                  x={center.x - 48}
                  y={center.y - 10 * inv}
                  width={96}
                  align="center"
                  text={room.name}
                  fontSize={11 * inv}
                  fontFamily="Instrument Serif"
                  fill="#8a847b"
                />
                <Text
                  x={center.x - 48}
                  y={center.y + 4 * inv}
                  width={96}
                  align="center"
                  text={`${Math.round(room.area / 144)} sq ft`}
                  fontSize={9 * inv}
                  fontFamily="Inter Tight"
                  fill="#a39c93"
                />
              </Group>
            )
          })
        : null}
      {layers.electrical
        ? plan.outlets.map((outlet) => (
            <MarkerNode
              key={outlet.id}
              projectId={projectId}
              layoutId={layoutId}
              kind="outlet"
              item={outlet}
              plan={plan}
              selected={isSelected(selections, 'outlet', outlet.id)}
              interactive={interactive}
              locked={locked}
              scale={scale}
            />
          ))
        : null}
      {layers.electrical
        ? plan.switches.map((item) => (
            <MarkerNode
              key={item.id}
              projectId={projectId}
              layoutId={layoutId}
              kind="switch"
              item={item}
              plan={plan}
              selected={isSelected(selections, 'switch', item.id)}
              interactive={interactive}
              locked={locked}
              scale={scale}
            />
          ))
        : null}
      {layers.measurements
        ? plan.measurements.map((item) => (
            <MeasureLine
              key={item.id}
              start={item.start}
              end={item.end}
              scale={scale}
              selected={isSelected(selections, 'measurement', item.id)}
              onSelect={() => setSelection({ kind: 'measurement', id: item.id })}
            />
          ))
        : null}
      <HoverMark plan={plan} scale={scale} />
    </Group>
  )
})

function HoverMark({ plan, scale }: { plan: FloorPlan; scale: number }) {
  const tool = useEditorStore((state) => state.tool)
  const preview = useEditorStore((state) => state.wallPreview)
  if (!preview || (tool !== 'door' && tool !== 'window' && tool !== 'outlet' && tool !== 'switch')) return null
  const hit = nearestWall(plan, preview, 16)
  if (!hit) return null
  const pos = pointAlongWall(hit.wall, hit.offset)
  const inv = 1 / scale
  return <Circle x={pos.x} y={pos.y} radius={4 * inv} stroke="#2c2a26" strokeWidth={inv} dash={[2 * inv, 2 * inv]} listening={false} />
}
