import type { Camera } from 'three'
import {
  activeGroupSession,
  endRigidGroupDrag,
  groupDragDidMutate,
  prepareActiveGroupSnapshot,
  startRigidGroupSession,
  translateLayoutGroup,
} from '../../editor/groupMove'
import { freeSelections } from '../../editor/selection'
import { useEditorStore } from '../../state/editorStore'
import { getLayout, useProjectStore } from '../../state/projectStore'
import { intersectFloorFromNdc, pointerToNdc } from './floorRay'
import { floorHitToPlanInches } from './furnitureTransform'

export const groupDrag = {
  grabbing: false,
  dragging: false,
  historyCaptured: false,
  startClient: { x: 0, y: 0 },
}

export function resetGroupDrag(finalize = false) {
  if (!groupDrag.grabbing) {
    groupDrag.dragging = false
    groupDrag.historyCaptured = false
    return
  }
  const mutated = groupDragDidMutate()
  const editor = useEditorStore.getState()
  if (finalize && mutated && editor.projectId && editor.layoutId) {
    useProjectStore.getState().updatePlan(editor.projectId, editor.layoutId, (plan) => plan)
  }
  endRigidGroupDrag()
  groupDrag.grabbing = false
  groupDrag.dragging = false
  groupDrag.historyCaptured = false
}

export function beginGroupPointer(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
): boolean {
  const editor = useEditorStore.getState()
  if (!editor.projectId || !editor.layoutId) return false
  const layout = getLayout(editor.projectId, editor.layoutId)
  if (!layout) return false
  const movable = freeSelections(editor.selections).filter((selection) => {
    if (selection.kind === 'furniture') {
      return layout.furniture.find((item) => item.id === selection.id)?.locked !== true
    }
    return layout.plan.fixtures.find((item) => item.id === selection.id)?.locked !== true
  })
  if (movable.length === 0) return false
  if (!pointerToNdc(clientX, clientY, canvas)) return false
  const hit = intersectFloorFromNdc(camera)
  if (!hit) return false
  const origin = floorHitToPlanInches(hit.x, hit.z)
  if (![origin.x, origin.y].every(Number.isFinite)) return false
  startRigidGroupSession(layout, movable, origin)
  groupDrag.grabbing = true
  groupDrag.dragging = false
  groupDrag.historyCaptured = false
  groupDrag.startClient = { x: clientX, y: clientY }
  return true
}

export function applyGroupPointer(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
): boolean {
  if (!groupDrag.grabbing) return false
  const editor = useEditorStore.getState()
  const session = activeGroupSession()
  if (!session || !editor.projectId || !editor.layoutId) return false
  if (!pointerToNdc(clientX, clientY, canvas)) return false
  const hit = intersectFloorFromNdc(camera)
  if (!hit) return false
  const now = floorHitToPlanInches(hit.x, hit.z)
  if (![now.x, now.y].every(Number.isFinite)) return false
  const dx = now.x - session.origin.x
  const dy = now.y - session.origin.y
  if (![dx, dy].every(Number.isFinite)) return false
  if (!groupDrag.historyCaptured) {
    editor.captureHistory()
    groupDrag.historyCaptured = true
  }
  useProjectStore.getState().patchLayout(
    editor.projectId,
    editor.layoutId,
    (current) => {
      const prepared = prepareActiveGroupSnapshot(current)
      if (!prepared) return current
      return translateLayoutGroup(prepared.layout, prepared.snapshot, dx, dy)
    },
    { rebuild: false },
  )
  return true
}
