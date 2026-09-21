import { Ellipse, Group, Line, Rect } from 'react-konva'
import { snapFixture } from '../architecture/fixtureSnap'
import { PIXELS_PER_INCH } from '../editor/constants'
import { canRigidGroupDrag, isSelected } from '../editor/selection'
import { useEditorStore } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'
import type { Fixture, FloorPlan } from '../types/spatial'
import { snapThresholdInches } from '../utils/snap'
import { beginRigidGroupDrag } from './groupDrag'

export function FixtureNode({
  projectId,
  layoutId,
  fixture,
  plan,
  selected,
  interactive,
  locked,
  scale,
}: {
  projectId: string
  layoutId: string
  fixture: Fixture
  plan: FloorPlan
  selected: boolean
  interactive: boolean
  locked: boolean
  scale: number
}) {
  const inv = 1 / scale
  const altHeld = useEditorStore((state) => state.altHeld)
  const gridEnabled = useEditorStore((state) => state.gridEnabled)
  const zoom = useEditorStore((state) => state.zoom)
  const selections = useEditorStore((state) => state.selections)
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  const selectObject = useEditorStore((state) => state.selectObject)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const updateFixture = useProjectStore((state) => state.updateFixture)
  const fill = selected ? '#ddd6ca' : '#e4ddd1'
  const stroke = selected ? '#2c2a26' : '#8d877e'
  const finCount = Math.max(3, Math.floor(fixture.width / 4))
  const inRigidGroup = selected && canRigidGroupDrag(selections)

  return (
    <Group
      x={fixture.x + fixture.width / 2}
      y={fixture.y + fixture.depth / 2}
      offsetX={fixture.width / 2}
      offsetY={fixture.depth / 2}
      rotation={fixture.rotation}
      draggable={interactive && !locked && !inRigidGroup}
      onMouseDown={(event) => {
        if (!interactive) return
        event.cancelBubble = true
        if (event.evt.shiftKey) {
          selectObject({ kind: 'fixture', id: fixture.id }, true)
          return
        }
        if (inRigidGroup) {
          beginRigidGroupDrag({ projectId, layoutId, stage: event.target.getStage() })
          return
        }
        selectObject({ kind: 'fixture', id: fixture.id })
      }}
      onContextMenu={(event) => {
        event.evt.preventDefault()
        selectObject({ kind: 'fixture', id: fixture.id })
        setContextMenu({
          clientX: event.evt.clientX,
          clientY: event.evt.clientY,
          selection: { kind: 'fixture', id: fixture.id },
          world: { x: fixture.x, y: fixture.y },
        })
      }}
      onDragStart={(event) => {
        if (!(interactive && !locked && !inRigidGroup)) {
          event.target.stopDrag()
          event.target.position({ x: fixture.x + fixture.width / 2, y: fixture.y + fixture.depth / 2 })
          return
        }
        if (!isSelected(useEditorStore.getState().selections, 'fixture', fixture.id)) {
          selectObject({ kind: 'fixture', id: fixture.id })
        }
        captureHistory()
      }}
      onDragMove={(event) => {
        const node = event.target
        const proposed: Fixture = {
          ...fixture,
          x: node.x() - fixture.width / 2,
          y: node.y() - fixture.depth / 2,
        }
        const snapped = snapFixture(proposed, plan, {
          enabled: !altHeld,
          grid: gridEnabled && !altHeld,
          threshold: snapThresholdInches(zoom, PIXELS_PER_INCH),
        })
        node.position({ x: snapped.x + fixture.width / 2, y: snapped.y + fixture.depth / 2 })
        updateFixture(projectId, layoutId, fixture.id, { x: snapped.x, y: snapped.y, rotation: snapped.rotation })
      }}
    >
      {fixture.type === 'column' && fixture.shape === 'circle' ? (
        <Ellipse
          x={fixture.width / 2}
          y={fixture.depth / 2}
          radiusX={fixture.width / 2}
          radiusY={fixture.depth / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.1 * inv}
        />
      ) : (
        <Rect width={fixture.width} height={fixture.depth} fill={fill} stroke={stroke} strokeWidth={1.1 * inv} />
      )}
      {fixture.type === 'radiator'
        ? Array.from({ length: finCount }, (_, index) => {
            const x = 4 + (index * (fixture.width - 8)) / Math.max(1, finCount - 1)
            return (
              <Line
                key={index}
                points={[x, 2, x, fixture.depth - 2]}
                stroke="#8d877e"
                strokeWidth={0.7 * inv}
                listening={false}
              />
            )
          })
        : null}
      {fixture.type === 'hvac-vent'
        ? Array.from({ length: 3 }, (_, index) => (
            <Line
              key={index}
              points={[3, 3 + ((fixture.depth - 6) * (index + 1)) / 4, fixture.width - 3, 3 + ((fixture.depth - 6) * (index + 1)) / 4]}
              stroke="#8d877e"
              strokeWidth={0.7 * inv}
              dash={[2 * inv, 1.6 * inv]}
              listening={false}
            />
          ))
        : null}
    </Group>
  )
}
