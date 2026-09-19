import type Konva from 'konva'
import { pointerToWorld } from './pointer'

export function startStageDrag(stage: Konva.Stage, onMove: () => void, onEnd: () => void) {
  const move = () => onMove()
  const end = () => {
    stage.off('mousemove', move)
    stage.off('mouseup', end)
    window.removeEventListener('mouseup', end)
    onEnd()
  }
  stage.on('mousemove', move)
  stage.on('mouseup', end)
  window.addEventListener('mouseup', end)
}

export function stageWorld(stage: Konva.Stage | null) {
  if (!stage) return null
  return pointerToWorld(stage)
}
