import type Konva from 'konva'
import { markerOffsetFromPointer, openingOffsetFromPointer } from '../architecture/mountedMove'
import { canRigidGroupDrag, isMountedKind, isSelected } from '../editor/selection'
import { useEditorStore } from '../state/editorStore'
import { getLayout, useProjectStore } from '../state/projectStore'
import type { SelectionKind } from '../types/spatial'
import { beginRigidGroupDrag } from './groupDrag'
import { startStageDrag, stageWorld } from './stageDrag'

export function beginMountedDrag(options: {
  projectId: string
  layoutId: string
  kind: SelectionKind
  id: string
  stage: Konva.Stage | null
  additive?: boolean
  locked?: boolean
}) {
  const { projectId, layoutId, kind, id, stage, additive, locked } = options
  if (!isMountedKind(kind)) return

  const editor = useEditorStore.getState()
  if (additive) {
    editor.selectObject({ kind, id }, true)
    return
  }

  if (isSelected(editor.selections, kind, id) && canRigidGroupDrag(editor.selections)) {
    beginRigidGroupDrag({ projectId, layoutId, stage })
    return
  }

  editor.selectObject({ kind, id })
  if (locked || !stage) return

  editor.captureHistory()
  editor.setDraggingOpeningId(id)

  startStageDrag(
    stage,
    () => {
      const world = stageWorld(stage)
      const layout = getLayout(projectId, layoutId)
      if (!world || !layout) return
      const plan = layout.plan
      const updatePlan = useProjectStore.getState().updatePlan

      if (kind === 'door') {
        const door = plan.doors.find((item) => item.id === id)
        const wall = door ? plan.walls.find((item) => item.id === door.wallId) : undefined
        if (!door || !wall) return
        const offset = openingOffsetFromPointer(world, wall, door.width)
        if (offset === door.offset) return
        updatePlan(
          projectId,
          layoutId,
          (current) => ({
            ...current,
            doors: current.doors.map((item) => (item.id === id ? { ...item, offset } : item)),
          }),
          { rebuild: false },
        )
        return
      }

      if (kind === 'window') {
        const window = plan.windows.find((item) => item.id === id)
        const wall = window ? plan.walls.find((item) => item.id === window.wallId) : undefined
        if (!window || !wall) return
        const offset = openingOffsetFromPointer(world, wall, window.width)
        if (offset === window.offset) return
        updatePlan(
          projectId,
          layoutId,
          (current) => ({
            ...current,
            windows: current.windows.map((item) => (item.id === id ? { ...item, offset } : item)),
          }),
          { rebuild: false },
        )
        return
      }

      if (kind === 'outlet' || kind === 'switch') {
        const item =
          kind === 'outlet'
            ? plan.outlets.find((entry) => entry.id === id)
            : plan.switches.find((entry) => entry.id === id)
        const wall = item ? plan.walls.find((entry) => entry.id === item.wallId) : undefined
        if (!item || !wall) return
        const offset = markerOffsetFromPointer(world, wall)
        if (offset === item.offset) return
        updatePlan(
          projectId,
          layoutId,
          (current) =>
            kind === 'outlet'
              ? { ...current, outlets: current.outlets.map((entry) => (entry.id === id ? { ...entry, offset } : entry)) }
              : { ...current, switches: current.switches.map((entry) => (entry.id === id ? { ...entry, offset } : entry)) },
          { rebuild: false },
        )
      }
    },
    () => useEditorStore.getState().setDraggingOpeningId(null),
  )
}
