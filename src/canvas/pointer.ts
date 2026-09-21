import type Konva from 'konva'
import { PIXELS_PER_INCH } from '../editor/constants'

export function pointerToWorld(
  stage: Konva.Stage,
  event?: MouseEvent | PointerEvent | TouchEvent,
): { x: number; y: number } | null {
  if (event) stage.setPointersPositions(event)
  const pointer = stage.getPointerPosition()
  if (!pointer) return null
  const scale = stage.scaleX() || PIXELS_PER_INCH
  return {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale,
  }
}
