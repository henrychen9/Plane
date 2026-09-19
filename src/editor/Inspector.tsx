import type { ReactNode } from 'react'
import {
  attachedCount,
  deleteMeasurement,
  deleteWall,
  duplicateWall,
  isAxisAlignedRectangle,
  setWallAngle,
  setWallLength,
  splitWallAt,
  totalEnclosedArea,
  updateRoomMeta,
  updateWall,
} from '../architecture/plan'
import { setVertexPosition } from '../architecture/vertices'
import { furnitureShapeOf } from '../furniture/shapes'
import { wallAngle, wallLength } from '../architecture/geometry'
import { getCatalogItem } from '../catalog/furniture'
import { NumberInput, UnitInput } from '../components/UnitInput'
import { deleteReferenceImage, readImageFile, saveReferenceImage } from '../data/referenceImage'
import { furnitureCollisions } from '../architecture/collision'
import { deleteSelection, duplicateSelection } from './clipboard'
import { MIN_FURNITURE_SIZE } from './constants'
import { useEditorStore } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'
import type { ColumnShape, DoorType, Fixture, FloorPlan, FurnitureItem, FurnitureShapeData, HingeSide, OutletType, SwingDirection, WallType } from '../types/spatial'
import { formatAreaSqFt, formatLength } from '../utils/units'
import { createId } from '../utils/id'

const SWATCHES = ['#E6D9CB', '#8A8178', '#C6B094', '#B89A78', '#D7CBB8', '#6F8A68', '#4E4A45', '#C17A6A', '#7A8FA6']
const ROOM_NAMES = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Hallway', 'Closet']

export function Inspector() {
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  const selection = useEditorStore((state) => state.selection)
  const selections = useEditorStore((state) => state.selections)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const setSelection = useEditorStore((state) => state.setSelection)
  const setPendingWallDelete = useEditorStore((state) => state.setPendingWallDelete)
  const setTool = useEditorStore((state) => state.setTool)
  const layout = useProjectStore((state) =>
    state.projects.find((project) => project.id === projectId)?.layouts.find((item) => item.id === layoutId),
  )
  const updateRoom = useProjectStore((state) => state.updateRoom)
  const updateFurniture = useProjectStore((state) => state.updateFurniture)
  const removeFurniture = useProjectStore((state) => state.removeFurniture)
  const duplicateFurniture = useProjectStore((state) => state.duplicateFurniture)
  const updatePlan = useProjectStore((state) => state.updatePlan)
  const updateFixture = useProjectStore((state) => state.updateFixture)
  const removeFixture = useProjectStore((state) => state.removeFixture)

  if (!projectId || !layoutId || !layout) return null
  const plan = layout.plan
  const furniture = selection?.kind === 'furniture' ? layout.furniture.find((item) => item.id === selection.id) : undefined

  const patchPlan = (updater: (current: FloorPlan) => FloorPlan) => {
    updatePlan(projectId, layoutId, updater)
  }

  return (
    <aside className="panel pointer-events-auto absolute bottom-3 right-3 top-[72px] z-20 w-[260px] max-w-[40vw] overflow-hidden rounded-xl">
      <div className="scroll-thin h-full overflow-auto p-4">
        {selections.length > 1 ? (
          <MultiInspector count={selections.length} />
        ) : furniture ? (
          <FurnitureInspector
            item={furniture}
            collisions={furnitureCollisions(furniture, plan)}
            onCommit={captureHistory}
            onChange={(patch) => updateFurniture(projectId, layoutId, furniture.id, patch)}
            onDuplicate={() => {
              captureHistory()
              const copy = duplicateFurniture(projectId, layoutId, furniture.id)
              if (copy) setSelection({ kind: 'furniture', id: copy.id })
            }}
            onDelete={() => {
              captureHistory()
              removeFurniture(projectId, layoutId, furniture.id)
              setSelection(null)
            }}
          />
        ) : selection?.kind === 'wall' ? (
          <WallInspector
            plan={plan}
            wallId={selection.id}
            onCommit={captureHistory}
            onPatch={patchPlan}
            onDelete={() => {
              const count = attachedCount(plan, selection.id)
              if (count > 0) {
                setPendingWallDelete({ wallId: selection.id, count })
                return
              }
              captureHistory()
              patchPlan((current) => deleteWall(current, selection.id))
              setSelection(null)
            }}
          />
        ) : selection?.kind === 'door' ? (
          <DoorInspector
            plan={plan}
            id={selection.id}
            onCommit={captureHistory}
            onPatch={patchPlan}
            onDelete={() => {
              captureHistory()
              patchPlan((current) => ({ ...current, doors: current.doors.filter((item) => item.id !== selection.id) }))
              setSelection(null)
            }}
          />
        ) : selection?.kind === 'window' ? (
          <WindowInspector
            plan={plan}
            id={selection.id}
            onCommit={captureHistory}
            onPatch={patchPlan}
            onDelete={() => {
              captureHistory()
              patchPlan((current) => ({ ...current, windows: current.windows.filter((item) => item.id !== selection.id) }))
              setSelection(null)
            }}
          />
        ) : selection?.kind === 'outlet' ? (
          <MarkerInspector
            title="Outlet"
            plan={plan}
            id={selection.id}
            kind="outlet"
            onCommit={captureHistory}
            onPatch={patchPlan}
            onDelete={() => {
              captureHistory()
              patchPlan((current) => ({ ...current, outlets: current.outlets.filter((item) => item.id !== selection.id) }))
              setSelection(null)
            }}
          />
        ) : selection?.kind === 'switch' ? (
          <MarkerInspector
            title="Switch"
            plan={plan}
            id={selection.id}
            kind="switch"
            onCommit={captureHistory}
            onPatch={patchPlan}
            onDelete={() => {
              captureHistory()
              patchPlan((current) => ({ ...current, switches: current.switches.filter((item) => item.id !== selection.id) }))
              setSelection(null)
            }}
          />
        ) : selection?.kind === 'fixture' ? (
          <FixtureInspector
            fixture={plan.fixtures.find((item) => item.id === selection.id)}
            architectureLocked={Boolean(plan.architectureLocked)}
            onCommit={captureHistory}
            onChange={(patch) => updateFixture(projectId, layoutId, selection.id, patch)}
            onDelete={() => {
              captureHistory()
              removeFixture(projectId, layoutId, selection.id)
              setSelection(null)
            }}
          />
        ) : selection?.kind === 'room' ? (
          <RoomInspector
            room={plan.rooms.find((item) => item.id === selection.id)}
            onCommit={captureHistory}
            onPatch={patchPlan}
          />
        ) : selection?.kind === 'measurement' ? (
          <div>
            <Eyebrow>Measurement</Eyebrow>
            <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">Dimension</h2>
            <Section title="Actions">
              <ActionButton
                danger
                onClick={() => {
                  captureHistory()
                  patchPlan((current) => deleteMeasurement(current, selection.id))
                  setSelection(null)
                }}
              >
                Delete
              </ActionButton>
            </Section>
          </div>
        ) : (
          <EmptyInspector
            plan={plan}
            width={layout.room.width}
            depth={layout.room.depth}
            onCommit={captureHistory}
            onResize={(patch) => updateRoom(projectId, layoutId, patch)}
            onPatch={patchPlan}
            onCalibrate={() => setTool('calibrate')}
          />
        )}
      </div>
    </aside>
  )
}

function FurnitureInspector({
  item,
  collisions,
  onCommit,
  onChange,
  onDuplicate,
  onDelete,
}: {
  item: FurnitureItem
  collisions: string[]
  onCommit: () => void
  onChange: (patch: Record<string, unknown>) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const shape = furnitureShapeOf(item)
  const thickness = item.shapeData?.thickness ?? 24
  const returnLength = item.shapeData?.returnLength ?? item.depth
  const patchShape = (next: FurnitureShapeData) => onChange({ shapeData: { ...item.shapeData, ...next } })
  return (
    <div>
      <Eyebrow>Object</Eyebrow>
      <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">{item.name}</h2>
      <p className="mt-2 text-[12px] capitalize text-muted">{getCatalogItem(item.type)?.category ?? item.type}</p>
      {collisions.length > 0 ? (
        <p className="mt-3 rounded-md bg-[#efe8dc] px-2 py-1.5 text-[12px] text-ink-soft">
          Placement overlaps a wall, opening, or column.
        </p>
      ) : null}
      <Section title="Transform">
        <Field label="X">
          <UnitInput valueInches={item.x} min={-1e6} ariaLabel="X" onCommit={onCommit} onChange={(value) => onChange({ x: value })} />
        </Field>
        <Field label="Y">
          <UnitInput valueInches={item.y} min={-1e6} ariaLabel="Y" onCommit={onCommit} onChange={(value) => onChange({ y: value })} />
        </Field>
        {shape === 'circle' ? (
          <Field label="Diameter">
            <UnitInput
              valueInches={item.width}
              ariaLabel="Diameter"
              onCommit={onCommit}
              onChange={(value) => {
                const size = Math.max(MIN_FURNITURE_SIZE, value)
                onChange({ width: size, depth: size })
              }}
            />
          </Field>
        ) : shape === 'lShape' ? (
          <>
            <Field label="Main Width">
              <UnitInput valueInches={item.width} ariaLabel="Main Width" onCommit={onCommit} onChange={(value) => onChange({ width: Math.max(MIN_FURNITURE_SIZE, value) })} />
            </Field>
            <Field label="Return Length">
              <UnitInput
                valueInches={returnLength}
                ariaLabel="Return Length"
                onCommit={onCommit}
                onChange={(value) => {
                  const next = Math.max(MIN_FURNITURE_SIZE, value)
                  onChange({ depth: next, shapeData: { ...item.shapeData, returnLength: next } })
                }}
              />
            </Field>
            <Field label="Depth">
              <UnitInput
                valueInches={thickness}
                ariaLabel="Depth"
                onCommit={onCommit}
                onChange={(value) => patchShape({ thickness: Math.max(6, value) })}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Width">
              <UnitInput valueInches={item.width} ariaLabel="Width" onCommit={onCommit} onChange={(value) => onChange({ width: Math.max(MIN_FURNITURE_SIZE, value) })} />
            </Field>
            <Field label="Depth">
              <UnitInput valueInches={item.depth} ariaLabel="Depth" onCommit={onCommit} onChange={(value) => onChange({ depth: Math.max(MIN_FURNITURE_SIZE, value) })} />
            </Field>
          </>
        )}
        <Field label="Height">
          <UnitInput valueInches={item.height} ariaLabel="Height" onCommit={onCommit} onChange={(value) => onChange({ height: Math.max(0.5, value) })} />
        </Field>
        <Field label="Rotation">
          <NumberInput value={item.rotation} suffix="°" ariaLabel="Rotation" onCommit={onCommit} onChange={(value) => onChange({ rotation: value })} />
        </Field>
      </Section>
      <Section title="Appearance">
        <Field label="Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={item.color}
              onChange={(event) => {
                onCommit()
                onChange({ color: event.target.value })
              }}
              className="h-8 w-8 cursor-pointer rounded-md border border-line bg-white p-0.5"
            />
            <span className="text-[12px] uppercase tracking-wide text-muted">{item.color}</span>
          </div>
        </Field>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => {
                onCommit()
                onChange({ color })
              }}
              className="h-5 w-5 rounded-full border border-black/10"
              style={{ background: color }}
            />
          ))}
        </div>
      </Section>
      <Section title="Actions">
        <ActionButton onClick={onDuplicate}>Duplicate</ActionButton>
        <ActionButton
          onClick={() => {
            onCommit()
            onChange({ locked: !item.locked })
          }}
        >
          {item.locked ? 'Unlock' : 'Lock'}
        </ActionButton>
        <ActionButton danger onClick={onDelete}>Delete</ActionButton>
      </Section>
    </div>
  )
}

function WallInspector({
  plan,
  wallId,
  onCommit,
  onPatch,
  onDelete,
}: {
  plan: FloorPlan
  wallId: string
  onCommit: () => void
  onPatch: (updater: (plan: FloorPlan) => FloorPlan) => void
  onDelete: () => void
}) {
  const wall = plan.walls.find((item) => item.id === wallId)
  if (!wall) return null
  const length = wallLength(wall)
  const angle = wallAngle(wall)
  return (
    <div>
      <Eyebrow>Wall</Eyebrow>
      <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">Wall</h2>
      <p className="mt-2 text-[12px] capitalize text-muted">{wall.type}</p>
      <Section title="Dimensions">
        <Field label="Length">
          <UnitInput valueInches={length} ariaLabel="Length" onCommit={onCommit} onChange={(value) => onPatch((current) => setWallLength(current, wall.id, value))} />
        </Field>
        <Field label="Thickness">
          <UnitInput valueInches={wall.thickness} ariaLabel="Thickness" onCommit={onCommit} onChange={(value) => onPatch((current) => updateWall(current, wall.id, { thickness: Math.max(1, value) }))} />
        </Field>
        <Field label="Angle">
          <NumberInput value={angle} suffix="°" ariaLabel="Angle" onCommit={onCommit} onChange={(value) => onPatch((current) => setWallAngle(current, wall.id, value))} />
        </Field>
        <Field label="Height">
          <UnitInput valueInches={wall.height} ariaLabel="Height" onCommit={onCommit} onChange={(value) => onPatch((current) => updateWall(current, wall.id, { height: Math.max(12, value) }))} />
        </Field>
      </Section>
      <Section title="Points">
        <Field label="Start X">
          <UnitInput valueInches={wall.start.x} min={-1e6} ariaLabel="Start X" onCommit={onCommit} onChange={(value) => onPatch((current) => setVertexPosition(current, wall.startVertexId, { x: value, y: wall.start.y }))} />
        </Field>
        <Field label="Start Y">
          <UnitInput valueInches={wall.start.y} min={-1e6} ariaLabel="Start Y" onCommit={onCommit} onChange={(value) => onPatch((current) => setVertexPosition(current, wall.startVertexId, { x: wall.start.x, y: value }))} />
        </Field>
        <Field label="End X">
          <UnitInput valueInches={wall.end.x} min={-1e6} ariaLabel="End X" onCommit={onCommit} onChange={(value) => onPatch((current) => setVertexPosition(current, wall.endVertexId, { x: value, y: wall.end.y }))} />
        </Field>
        <Field label="End Y">
          <UnitInput valueInches={wall.end.y} min={-1e6} ariaLabel="End Y" onCommit={onCommit} onChange={(value) => onPatch((current) => setVertexPosition(current, wall.endVertexId, { x: wall.end.x, y: value }))} />
        </Field>
      </Section>
      <Section title="Type">
        <select
          value={wall.type}
          onChange={(event) => {
            onCommit()
            onPatch((current) => updateWall(current, wall.id, { type: event.target.value as WallType }))
          }}
          className="h-8 w-full rounded-md border border-line bg-white/70 px-2 text-[13px] outline-none"
        >
          <option value="exterior">Exterior</option>
          <option value="interior">Interior</option>
          <option value="partition">Partition</option>
        </select>
      </Section>
      <Section title="Actions">
        <ActionButton
          onClick={() => {
            onCommit()
            onPatch((current) => updateWall(current, wall.id, { locked: !wall.locked }))
          }}
        >
          {wall.locked ? 'Unlock' : 'Lock'}
        </ActionButton>
        <ActionButton
          onClick={() => {
            onCommit()
            onPatch((current) => splitWallAt(current, wall.id, length / 2))
          }}
        >
          Split Wall
        </ActionButton>
        <ActionButton
          onClick={() => {
            onCommit()
            onPatch((current) => duplicateWall(current, wall.id))
          }}
        >
          Duplicate
        </ActionButton>
        <ActionButton danger onClick={onDelete}>Delete</ActionButton>
      </Section>
    </div>
  )
}

function DoorInspector({
  plan,
  id,
  onCommit,
  onPatch,
  onDelete,
}: {
  plan: FloorPlan
  id: string
  onCommit: () => void
  onPatch: (updater: (plan: FloorPlan) => FloorPlan) => void
  onDelete: () => void
}) {
  const door = plan.doors.find((item) => item.id === id)
  if (!door) return null
  return (
    <div>
      <Eyebrow>Door</Eyebrow>
      <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">Door</h2>
      <Section title="Properties">
        <Field label="Width">
          <UnitInput
            valueInches={door.width}
            ariaLabel="Width"
            onCommit={onCommit}
            onChange={(value) => onPatch((current) => ({ ...current, doors: current.doors.map((item) => item.id === id ? { ...item, width: Math.max(18, value) } : item) }))}
          />
        </Field>
        <Field label="Type">
          <select
            value={door.type}
            onChange={(event) => {
              onCommit()
              onPatch((current) => ({ ...current, doors: current.doors.map((item) => item.id === id ? { ...item, type: event.target.value as DoorType } : item) }))
            }}
            className="h-8 w-full rounded-md border border-line bg-white/70 px-2 text-[13px]"
          >
            <option value="hinged">Hinged</option>
            <option value="sliding">Sliding</option>
            <option value="pocket">Pocket</option>
          </select>
        </Field>
        <Field label="Hinge">
          <select
            value={door.hingeSide}
            onChange={(event) => {
              onCommit()
              onPatch((current) => ({ ...current, doors: current.doors.map((item) => item.id === id ? { ...item, hingeSide: event.target.value as HingeSide } : item) }))
            }}
            className="h-8 w-full rounded-md border border-line bg-white/70 px-2 text-[13px]"
          >
            <option value="start">Start</option>
            <option value="end">End</option>
          </select>
        </Field>
        <Field label="Swing">
          <select
            value={door.swingDirection}
            onChange={(event) => {
              onCommit()
              onPatch((current) => ({ ...current, doors: current.doors.map((item) => item.id === id ? { ...item, swingDirection: event.target.value as SwingDirection } : item) }))
            }}
            className="h-8 w-full rounded-md border border-line bg-white/70 px-2 text-[13px]"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </Field>
      </Section>
      <Section title="Actions">
        <ActionButton
          onClick={() => {
            onCommit()
            onPatch((current) => ({
              ...current,
              doors: [
                ...current.doors,
                { ...door, id: createId('dor'), offset: door.offset + 8 },
              ],
            }))
          }}
        >
          Duplicate
        </ActionButton>
        <ActionButton danger onClick={onDelete}>Delete</ActionButton>
      </Section>
    </div>
  )
}

function WindowInspector({
  plan,
  id,
  onCommit,
  onPatch,
  onDelete,
}: {
  plan: FloorPlan
  id: string
  onCommit: () => void
  onPatch: (updater: (plan: FloorPlan) => FloorPlan) => void
  onDelete: () => void
}) {
  const window = plan.windows.find((item) => item.id === id)
  if (!window) return null
  return (
    <div>
      <Eyebrow>Window</Eyebrow>
      <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">Window</h2>
      <Section title="Properties">
        <Field label="Width">
          <UnitInput valueInches={window.width} ariaLabel="Width" onCommit={onCommit} onChange={(value) => onPatch((current) => ({ ...current, windows: current.windows.map((item) => item.id === id ? { ...item, width: Math.max(12, value) } : item) }))} />
        </Field>
        <Field label="Height">
          <UnitInput valueInches={window.height} ariaLabel="Height" onCommit={onCommit} onChange={(value) => onPatch((current) => ({ ...current, windows: current.windows.map((item) => item.id === id ? { ...item, height: Math.max(12, value) } : item) }))} />
        </Field>
        <Field label="Sill">
          <UnitInput valueInches={window.sillHeight} ariaLabel="Sill height" onCommit={onCommit} onChange={(value) => onPatch((current) => ({ ...current, windows: current.windows.map((item) => item.id === id ? { ...item, sillHeight: Math.max(0, value) } : item) }))} />
        </Field>
      </Section>
      <Section title="Actions">
        <ActionButton
          onClick={() => {
            onCommit()
            onPatch((current) => ({ ...current, windows: [...current.windows, { ...window, id: createId('win'), offset: window.offset + 8 }] }))
          }}
        >
          Duplicate
        </ActionButton>
        <ActionButton danger onClick={onDelete}>Delete</ActionButton>
      </Section>
    </div>
  )
}

function MarkerInspector({
  title,
  plan,
  id,
  kind,
  onCommit,
  onPatch,
  onDelete,
}: {
  title: string
  plan: FloorPlan
  id: string
  kind: 'outlet' | 'switch'
  onCommit: () => void
  onPatch: (updater: (plan: FloorPlan) => FloorPlan) => void
  onDelete: () => void
}) {
  const item = kind === 'outlet' ? plan.outlets.find((entry) => entry.id === id) : plan.switches.find((entry) => entry.id === id)
  if (!item) return null
  const wall = plan.walls.find((entry) => entry.id === item.wallId)
  const fromStart = item.offset
  const fromEnd = wall ? wallLength(wall) - item.offset : 0
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">{title}</h2>
      <Section title="Placement">
        <Field label="From start">
          <UnitInput
            valueInches={fromStart}
            ariaLabel="Distance from start"
            onCommit={onCommit}
            onChange={(value) =>
              onPatch((current) =>
                kind === 'outlet'
                  ? { ...current, outlets: current.outlets.map((entry) => (entry.id === id ? { ...entry, offset: value } : entry)) }
                  : { ...current, switches: current.switches.map((entry) => (entry.id === id ? { ...entry, offset: value } : entry)) },
              )
            }
          />
        </Field>
        <p className="mb-3 text-[12px] text-muted">Distance from left endpoint: {formatLength(fromStart)}</p>
        <p className="text-[12px] text-muted">From other end: {formatLength(fromEnd)}</p>
        {kind === 'outlet' && 'type' in item ? (
          <Field label="Type">
            <select
              value={(item as { type: OutletType }).type}
              onChange={(event) => {
                onCommit()
                onPatch((current) => ({
                  ...current,
                  outlets: current.outlets.map((entry) =>
                    entry.id === id ? { ...entry, type: event.target.value as OutletType } : entry,
                  ),
                }))
              }}
              className="h-8 w-full rounded-md border border-line bg-white/70 px-2 text-[13px]"
            >
              <option value="standard">Standard</option>
              <option value="double">Double</option>
              <option value="gfci">GFCI</option>
              <option value="floor">Floor outlet</option>
            </select>
          </Field>
        ) : null}
      </Section>
      <Section title="Actions">
        <ActionButton
          onClick={() => {
            onCommit()
            onPatch((current) =>
              kind === 'outlet'
                ? { ...current, outlets: [...current.outlets, { ...current.outlets.find((entry) => entry.id === id)!, id: createId('out'), offset: item.offset + 8 }] }
                : { ...current, switches: [...current.switches, { ...item, id: createId('sw'), offset: item.offset + 8 }] },
            )
          }}
        >
          Duplicate
        </ActionButton>
        <ActionButton danger onClick={onDelete}>Delete</ActionButton>
      </Section>
    </div>
  )
}

function FixtureInspector({
  fixture,
  architectureLocked,
  onCommit,
  onChange,
  onDelete,
}: {
  fixture?: Fixture
  architectureLocked: boolean
  onCommit: () => void
  onChange: (patch: Partial<Fixture>) => void
  onDelete: () => void
}) {
  if (!fixture) return null
  return (
    <div>
      <Eyebrow>Structure</Eyebrow>
      <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">{fixture.name}</h2>
      <Section title="Transform">
        <Field label="X">
          <UnitInput valueInches={fixture.x} min={-1e6} ariaLabel="X" onCommit={onCommit} onChange={(value) => onChange({ x: value })} />
        </Field>
        <Field label="Y">
          <UnitInput valueInches={fixture.y} min={-1e6} ariaLabel="Y" onCommit={onCommit} onChange={(value) => onChange({ y: value })} />
        </Field>
        <Field label="Width">
          <UnitInput valueInches={fixture.width} ariaLabel="Width" onCommit={onCommit} onChange={(value) => onChange({ width: Math.max(4, value) })} />
        </Field>
        <Field label="Depth">
          <UnitInput valueInches={fixture.depth} ariaLabel="Depth" onCommit={onCommit} onChange={(value) => onChange({ depth: Math.max(4, value) })} />
        </Field>
        <Field label="Rotation">
          <NumberInput value={fixture.rotation} suffix="°" ariaLabel="Rotation" onCommit={onCommit} onChange={(value) => onChange({ rotation: value })} />
        </Field>
        {fixture.type === 'column' ? (
          <Field label="Shape">
            <select
              value={fixture.shape ?? 'rectangle'}
              onChange={(event) => {
                onCommit()
                onChange({ shape: event.target.value as ColumnShape })
              }}
              className="h-8 w-full rounded-md border border-line bg-white/70 px-2 text-[13px]"
            >
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
            </select>
          </Field>
        ) : null}
      </Section>
      <Section title="Actions">
        <ActionButton
          onClick={() => {
            onCommit()
            onChange({ locked: !fixture.locked })
          }}
        >
          {fixture.locked || architectureLocked ? 'Unlock' : 'Lock'}
        </ActionButton>
        <ActionButton danger onClick={onDelete}>Delete</ActionButton>
      </Section>
    </div>
  )
}

function RoomInspector({
  room,
  onCommit,
  onPatch,
}: {
  room?: { id: string; name: string; area: number; perimeter: number; floorMaterial?: string }
  onCommit: () => void
  onPatch: (updater: (plan: FloorPlan) => FloorPlan) => void
}) {
  if (!room) return null
  return (
    <div>
      <Eyebrow>Room</Eyebrow>
      <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">{room.name}</h2>
      <p className="mt-2 text-[12px] text-muted">{formatAreaSqFt(room.area)}</p>
      <Section title="Identity">
        <Field label="Name">
          <input
            value={room.name}
            onChange={(event) => onPatch((current) => updateRoomMeta(current, room.id, { name: event.target.value }))}
            onFocus={onCommit}
            className="h-8 w-full rounded-md border border-line bg-white/70 px-2 text-[13px] outline-none"
          />
        </Field>
        <div className="mb-3 flex flex-wrap gap-1">
          {ROOM_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onCommit()
                onPatch((current) => updateRoomMeta(current, room.id, { name }))
              }}
              className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-soft hover:bg-paper-deep"
            >
              {name}
            </button>
          ))}
        </div>
        <Field label="Floor">
          <input
            value={room.floorMaterial ?? ''}
            placeholder="Optional"
            onChange={(event) => onPatch((current) => updateRoomMeta(current, room.id, { floorMaterial: event.target.value }))}
            onFocus={onCommit}
            className="h-8 w-full rounded-md border border-line bg-white/70 px-2 text-[13px] outline-none"
          />
        </Field>
      </Section>
      <Section title="Measure">
        <p className="text-[13px] text-ink">Area {formatAreaSqFt(room.area)}</p>
        <p className="mt-1 text-[13px] text-ink-soft">Perimeter {formatLength(room.perimeter)}</p>
      </Section>
    </div>
  )
}

function EmptyInspector({
  plan,
  width,
  depth,
  onCommit,
  onResize,
  onPatch,
  onCalibrate,
}: {
  plan: FloorPlan
  width: number
  depth: number
  onCommit: () => void
  onResize: (patch: { width?: number; depth?: number }) => void
  onPatch: (updater: (plan: FloorPlan) => FloorPlan) => void
  onCalibrate: () => void
}) {
  const area = totalEnclosedArea(plan.rooms)
  const rectangular = isAxisAlignedRectangle(plan)
  return (
    <div>
      <Eyebrow>Plan</Eyebrow>
      <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">Apartment</h2>
      <p className="mt-2 text-[12px] text-muted">
        {plan.rooms.length === 0 ? 'Draw walls to form rooms' : `Total enclosed area: ${formatAreaSqFt(area)}`}
      </p>
      {rectangular ? (
        <Section title="Envelope">
          <Field label="Width">
            <UnitInput valueInches={width} ariaLabel="Width" onCommit={onCommit} onChange={(value) => onResize({ width: Math.max(36, value) })} />
          </Field>
          <Field label="Depth">
            <UnitInput valueInches={depth} ariaLabel="Depth" onCommit={onCommit} onChange={(value) => onResize({ depth: Math.max(36, value) })} />
          </Field>
        </Section>
      ) : null}
      <Section title="Architecture">
        <ActionButton
          onClick={() => {
            onCommit()
            onPatch((current) => ({ ...current, architectureLocked: !current.architectureLocked }))
          }}
        >
          {plan.architectureLocked ? 'Unlock architecture' : 'Lock architecture'}
        </ActionButton>
        <ActionButton
          onClick={() => onPatch((current) => ({ ...current, showWallLengths: !(current.showWallLengths ?? true) }))}
        >
          {(plan.showWallLengths ?? true) ? 'Hide wall lengths' : 'Show wall lengths'}
        </ActionButton>
      </Section>
      <Section title="Reference">
        <label className="flex h-8 cursor-pointer items-center rounded-md px-2 text-[13px] text-ink hover:bg-paper-deep">
          Upload reference floorplan
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const { dataUrl, width: imageW, height: imageH } = await readImageFile(file)
              const id = createId('ref')
              await saveReferenceImage(id, dataUrl)
              onCommit()
              onPatch((current) => ({
                ...current,
                reference: {
                  id,
                  opacity: 0.4,
                  scale: width / imageW,
                  rotation: 0,
                  x: 0,
                  y: 0,
                  locked: false,
                  hidden: false,
                  nativeWidth: imageW,
                  nativeHeight: imageH,
                },
              }))
            }}
          />
        </label>
        {plan.reference ? (
          <>
            <Field label="Opacity">
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={plan.reference.opacity}
                onChange={(event) =>
                  onPatch((current) =>
                    current.reference
                      ? { ...current, reference: { ...current.reference, opacity: Number(event.target.value) } }
                      : current,
                  )
                }
              />
            </Field>
            <ActionButton onClick={onCalibrate}>Calibrate scale</ActionButton>
            <ActionButton
              onClick={() =>
                onPatch((current) =>
                  current.reference ? { ...current, reference: { ...current.reference, hidden: !current.reference.hidden } } : current,
                )
              }
            >
              {plan.reference.hidden ? 'Show reference' : 'Hide reference'}
            </ActionButton>
            <ActionButton
              onClick={() =>
                onPatch((current) =>
                  current.reference ? { ...current, reference: { ...current.reference, locked: !current.reference.locked } } : current,
                )
              }
            >
              {plan.reference.locked ? 'Unlock image' : 'Lock image'}
            </ActionButton>
            <ActionButton
              danger
              onClick={async () => {
                if (plan.reference) await deleteReferenceImage(plan.reference.id)
                onCommit()
                onPatch((current) => ({ ...current, reference: undefined }))
              }}
            >
              Remove image
            </ActionButton>
          </>
        ) : null}
      </Section>
    </div>
  )
}

function MultiInspector({ count }: { count: number }) {
  return (
    <div>
      <Eyebrow>Selection</Eyebrow>
      <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">{count} items</h2>
      <p className="mt-2 text-[12px] text-muted">Move, copy, duplicate, or delete together.</p>
      <Section title="Actions">
        <ActionButton
          onClick={() => {
            duplicateSelection()
          }}
        >
          Duplicate
        </ActionButton>
        <ActionButton danger onClick={() => deleteSelection()}>
          Delete
        </ActionButton>
      </Section>
    </div>
  )
}

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{children}</p>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{title}</p>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-2 grid grid-cols-[72px_1fr] items-center gap-2">
      <span className="text-[12px] text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

function ActionButton({
  children,
  onClick,
  danger,
}: {
  children: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-full items-center rounded-md px-2 text-left text-[13px] transition hover:bg-paper-deep ${
        danger ? 'text-red-800' : 'text-ink'
      }`}
    >
      {children}
    </button>
  )
}
