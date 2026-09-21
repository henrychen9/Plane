import type Konva from 'konva'
import { pointerToWorld } from './pointer'

export function startStageDrag(stage: Konva.Stage, onMove: () => void, onEnd: () => void) {
  const move = (event: PointerEvent) => {
    stage.setPointersPositions(event)
    onMove()
  }
  const end = (event: PointerEvent) => {
    stage.setPointersPositions(event)
    window.removeEventListener('pointermove', move, true)
    window.removeEventListener('pointerup', end, true)
    window.removeEventListener('pointercancel', end, true)
    onEnd()
  }
  window.addEventListener('pointermove', move, true)
  window.addEventListener('pointerup', end, true)
  window.addEventListener('pointercancel', end, true)
}

export function stageWorld(stage: Konva.Stage | null) {
  if (!stage) return null
  return pointerToWorld(stage)
}
