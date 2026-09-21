import type Konva from 'konva'
import { GRID_INCHES } from '../editor/constants'
import {
  activeGroupSession,
  endRigidGroupDrag,
  groupDragDidMutate,
  hasActiveGroupDrag,
  prepareActiveGroupSnapshot,
  startRigidGroupSession,
  translateLayoutGroup,
} from '../editor/groupMove'
import { canRigidGroupDrag } from '../editor/selection'
import { useEditorStore } from '../state/editorStore'
import { getLayout, useProjectStore } from '../state/projectStore'
import { startStageDrag, stageWorld } from './stageDrag'

export { canRigidGroupDrag, hasActiveGroupDrag }

function snapGroupDelta(dx: number, dy: number, bounds: { x: number; y: number } | null): { dx: number; dy: number } {
  const editor = useEditorStore.getState()
  if (!bounds || !editor.gridEnabled || editor.altHeld) return { dx, dy }
  return {
    dx: Math.round((bounds.x + dx) / GRID_INCHES) * GRID_INCHES - bounds.x,
    dy: Math.round((bounds.y + dy) / GRID_INCHES) * GRID_INCHES - bounds.y,
  }
}

export function beginRigidGroupDrag(options: {
  projectId: string
  layoutId: string
  stage: Konva.Stage | null
}): boolean {
  const { projectId, layoutId, stage } = options
  if (!stage || hasActiveGroupDrag()) return false
  const editor = useEditorStore.getState()
  if (!canRigidGroupDrag(editor.selections)) return false
  const origin = stageWorld(stage)
  if (!origin) return false
  const layout = getLayout(projectId, layoutId)
  if (!layout) return false

  startRigidGroupSession(layout, editor.selections, origin)

  startStageDrag(
    stage,
    () => {
      const world = stageWorld(stage)
      const session = activeGroupSession()
      if (!world || !session) return
      const snapped = snapGroupDelta(world.x - session.origin.x, world.y - session.origin.y, session.bounds)
      if (!session.snapshot && snapped.dx === 0 && snapped.dy === 0) return
      if (!session.snapshot) useEditorStore.getState().captureHistory()
      useProjectStore.getState().patchLayout(
        projectId,
        layoutId,
        (current) => {
          const prepared = prepareActiveGroupSnapshot(current)
          if (!prepared) return current
          return translateLayoutGroup(prepared.layout, prepared.snapshot, snapped.dx, snapped.dy)
        },
        { rebuild: false },
      )
    },
    () => {
      if (groupDragDidMutate()) {
        useProjectStore.getState().updatePlan(projectId, layoutId, (plan) => plan)
      }
      endRigidGroupDrag()
    },
  )
  return true
}
