import { attachedCount, deleteWall, duplicateWall, splitWallAt, updateWall } from '../architecture/plan'
import { projectOnWall } from '../architecture/geometry'
import { useEditorStore } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'
import { createId } from '../utils/id'

export function ContextMenu() {
  const menu = useEditorStore((state) => state.contextMenu)
  const setContextMenu = useEditorStore((state) => state.setContextMenu)
  const setSelection = useEditorStore((state) => state.setSelection)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const setPendingWallDelete = useEditorStore((state) => state.setPendingWallDelete)
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  const layout = useProjectStore((state) =>
    state.projects.find((project) => project.id === projectId)?.layouts.find((item) => item.id === layoutId),
  )
  const updatePlan = useProjectStore((state) => state.updatePlan)
  const updateFurniture = useProjectStore((state) => state.updateFurniture)
  const removeFurniture = useProjectStore((state) => state.removeFurniture)
  const duplicateFurniture = useProjectStore((state) => state.duplicateFurniture)
  const removeFixture = useProjectStore((state) => state.removeFixture)

  if (!menu || !projectId || !layoutId || !layout) return null
  const { selection } = menu
  const plan = layout.plan

  const close = () => setContextMenu(null)
  const items: { label: string; danger?: boolean; onClick: () => void }[] = []

  if (selection.kind === 'wall') {
    const wall = plan.walls.find((item) => item.id === selection.id)
    items.push(
      {
        label: 'Split Wall',
        onClick: () => {
          if (!wall) return
          captureHistory()
          const hit = projectOnWall(menu.world, wall)
          updatePlan(projectId, layoutId, (current) => splitWallAt(current, selection.id, hit.offset))
        },
      },
      {
        label: wall?.locked ? 'Unlock' : 'Lock',
        onClick: () => {
          captureHistory()
          updatePlan(projectId, layoutId, (current) => updateWall(current, selection.id, { locked: !wall?.locked }))
        },
      },
      {
        label: 'Duplicate',
        onClick: () => {
          captureHistory()
          updatePlan(projectId, layoutId, (current) => duplicateWall(current, selection.id))
        },
      },
      {
        label: 'Delete',
        danger: true,
        onClick: () => {
          const count = attachedCount(plan, selection.id)
          if (count > 0) {
            setPendingWallDelete({ wallId: selection.id, count })
            return
          }
          captureHistory()
          updatePlan(projectId, layoutId, (current) => deleteWall(current, selection.id))
          setSelection(null)
        },
      },
    )
  }

  if (selection.kind === 'furniture') {
    const item = layout.furniture.find((entry) => entry.id === selection.id)
    items.push(
      {
        label: 'Duplicate',
        onClick: () => {
          captureHistory()
          const copy = duplicateFurniture(projectId, layoutId, selection.id)
          if (copy) setSelection({ kind: 'furniture', id: copy.id })
        },
      },
      {
        label: item?.locked ? 'Unlock' : 'Lock',
        onClick: () => {
          captureHistory()
          updateFurniture(projectId, layoutId, selection.id, { locked: !item?.locked })
        },
      },
      {
        label: 'Delete',
        danger: true,
        onClick: () => {
          captureHistory()
          removeFurniture(projectId, layoutId, selection.id)
          setSelection(null)
        },
      },
    )
  }

  if (selection.kind === 'door' || selection.kind === 'window' || selection.kind === 'outlet' || selection.kind === 'switch') {
    items.push(
      { label: 'Edit', onClick: () => setSelection(selection) },
      {
        label: 'Duplicate',
        onClick: () => {
          captureHistory()
          updatePlan(projectId, layoutId, (current) => {
            if (selection.kind === 'door') {
              const source = current.doors.find((item) => item.id === selection.id)
              return source ? { ...current, doors: [...current.doors, { ...source, id: createId('dor'), offset: source.offset + 8 }] } : current
            }
            if (selection.kind === 'window') {
              const source = current.windows.find((item) => item.id === selection.id)
              return source ? { ...current, windows: [...current.windows, { ...source, id: createId('win'), offset: source.offset + 8 }] } : current
            }
            if (selection.kind === 'outlet') {
              const source = current.outlets.find((item) => item.id === selection.id)
              return source ? { ...current, outlets: [...current.outlets, { ...source, id: createId('out'), offset: source.offset + 8 }] } : current
            }
            const source = current.switches.find((item) => item.id === selection.id)
            return source ? { ...current, switches: [...current.switches, { ...source, id: createId('sw'), offset: source.offset + 8 }] } : current
          })
        },
      },
      {
        label: 'Delete',
        danger: true,
        onClick: () => {
          captureHistory()
          updatePlan(projectId, layoutId, (current) => {
            if (selection.kind === 'door') return { ...current, doors: current.doors.filter((item) => item.id !== selection.id) }
            if (selection.kind === 'window') return { ...current, windows: current.windows.filter((item) => item.id !== selection.id) }
            if (selection.kind === 'outlet') return { ...current, outlets: current.outlets.filter((item) => item.id !== selection.id) }
            return { ...current, switches: current.switches.filter((item) => item.id !== selection.id) }
          })
          setSelection(null)
        },
      },
    )
  }

  if (selection.kind === 'fixture') {
    const fixture = plan.fixtures.find((item) => item.id === selection.id)
    items.push(
      {
        label: fixture?.locked ? 'Unlock' : 'Lock',
        onClick: () => {
          captureHistory()
          updatePlan(projectId, layoutId, (current) => ({
            ...current,
            fixtures: current.fixtures.map((item) =>
              item.id === selection.id ? { ...item, locked: !item.locked } : item,
            ),
          }))
        },
      },
      {
        label: 'Delete',
        danger: true,
        onClick: () => {
          captureHistory()
          removeFixture(projectId, layoutId, selection.id)
          setSelection(null)
        },
      },
    )
  }

  if (items.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={close}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="anim-pop absolute w-44 overflow-hidden rounded-xl border border-line bg-[#fffdf9] py-1 shadow-[0_12px_32px_rgba(44,42,38,0.12)]"
        style={{ left: menu.clientX, top: menu.clientY }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              item.onClick()
              close()
            }}
            className={`flex h-8 w-full items-center px-3 text-left text-[13px] hover:bg-paper-deep ${
              item.danger ? 'text-red-800' : 'text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DeleteWallDialog() {
  const pending = useEditorStore((state) => state.pendingWallDelete)
  const setPending = useEditorStore((state) => state.setPendingWallDelete)
  const setSelection = useEditorStore((state) => state.setSelection)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  const updatePlan = useProjectStore((state) => state.updatePlan)
  if (!pending || !projectId || !layoutId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10" data-within-panel="true">
      <div className="panel w-80 rounded-2xl p-5">
        <p className="font-serif text-[24px] text-ink">Delete wall?</p>
        <p className="mt-2 text-[13px] text-ink-soft">
          This wall contains {pending.count} attached {pending.count === 1 ? 'element' : 'elements'}.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="h-8 rounded-md px-3 text-[13px] text-muted" onClick={() => setPending(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="h-8 rounded-md bg-ink px-3 text-[13px] text-white"
            onClick={() => {
              captureHistory()
              updatePlan(projectId, layoutId, (current) => deleteWall(current, pending.wallId))
              setSelection(null)
              setPending(null)
            }}
          >
            Delete All
          </button>
        </div>
      </div>
    </div>
  )
}