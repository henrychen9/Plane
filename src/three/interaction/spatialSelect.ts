import { can3DGroupDrag, isSelected } from '../../editor/selection'
import { useEditorStore } from '../../state/editorStore'
import type { EditorSelection, SelectionKind } from '../../types/spatial'

export type SpatialPointerIntent = 'toggle' | 'group' | 'single'

function nativeShift(event: { nativeEvent?: { shiftKey?: boolean }; shiftKey?: boolean }) {
  return Boolean(event.nativeEvent?.shiftKey ?? event.shiftKey)
}

/** 3D click selection. Uses only the native shift key so a stuck shiftHeld cannot accumulate. */
export function applySpatialClick(
  kind: SelectionKind,
  id: string,
  shiftKey: boolean,
): SpatialPointerIntent {
  const editor = useEditorStore.getState()
  const target: EditorSelection = { kind, id }
  if (!shiftKey && editor.shiftHeld) editor.setModifiers({ shiftHeld: false })
  if (shiftKey) {
    editor.toggleSelection(target)
    return 'toggle'
  }
  if (isSelected(editor.selections, kind, id)) {
    if (can3DGroupDrag(editor.selections)) return 'group'
    return 'single'
  }
  editor.selectOnly(target)
  return 'single'
}

export function resolveSpatialPointer(
  kind: Extract<SelectionKind, 'furniture' | 'fixture'>,
  id: string,
  event: { nativeEvent?: { shiftKey?: boolean }; shiftKey?: boolean },
): SpatialPointerIntent {
  return applySpatialClick(kind, id, nativeShift(event))
}
