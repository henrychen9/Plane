import { Ellipse, Group, Line, Rect } from 'react-konva'
import { snapFixture } from '../architecture/fixtureSnap'
import { PIXELS_PER_INCH } from '../editor/constants'
import { startFreeGroupDrag, activeGroupDelta, endFreeGroupDrag, translateLayoutGroup } from '../editor/groupMove'
import { canGroupTranslate, isSelected } from '../editor/selection'
import { useEditorStore } from '../state/editorStore'
import { getLayout, useProjectStore } from '../state/projectStore'
import type { Fixture, FloorPlan } from '../types/spatial'
import { snapThresholdInches } from '../utils/snap'

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
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  const selectObject = useEditorStore((state) => state.selectObject)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const updateFixture = useProjectStore((state) => state.updateFixture)
  const patchLayout = useProjectStore((state) => state.patchLayout)
  const fill = selected ? '#ddd6ca' : '#e4ddd1'
  const stroke = selected ? '#2c2a26' : '#8d877e'
  const finCount = Math.max(3, Math.floor(fixture.width / 4))

  return (
    <Group
      x={fixture.x + fixture.width / 2}
      y={fixture.y + fixture.depth / 2}
      offsetX={fixture.width / 2}
      offsetY={fixture.depth / 2}
      rotation={fixture.rotation}
      draggable={interactive && !locked}
      onMouseDown={(event) => {
        if (!interactive) return
        event.cancelBubble = true
        selectObject({ kind: 'fixture', id: fixture.id }, event.evt.shiftKey)
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
        const editor = useEditorStore.getState()
        const selected = isSelected(editor.selections, 'fixture', fixture.id)
        if (editor.selections.length > 1 && selected && !canGroupTranslate(editor.selections)) {
          event.target.stopDrag()
          event.target.position({ x: fixture.x + fixture.width / 2, y: fixture.y + fixture.depth / 2 })
          editor.setHoverHint('Some selected items are wall-mounted.')
          return
        }
        if (!(editor.selections.length > 1 && selected)) {
          selectObject({ kind: 'fixture', id: fixture.id })
        }
        const layout = getLayout(projectId, layoutId)
        if (layout && editor.selections.length > 1 && selected && canGroupTranslate(editor.selections)) {
          startFreeGroupDrag(layout, editor.selections, fixture.id, fixture.x, fixture.y)
        }
        captureHistory()
      }}
      onDragMove={(event) => {
        const node = event.target
        const group = activeGroupDelta(node.x() - fixture.width / 2, node.y() - fixture.depth / 2)
        if (group) {
          patchLayout(projectId, layoutId, (current) => translateLayoutGroup(current, group.snapshot, group.dx, group.dy), {
            rebuild: false,
          })
          return
        }
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
      onDragEnd={() => endFreeGroupDrag()}
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
