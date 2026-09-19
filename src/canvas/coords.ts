import { PIXELS_PER_INCH } from '../editor/constants'

export function clientToWorld(
  clientX: number,
  clientY: number,
  bounds: DOMRect,
  pan: { x: number; y: number },
  zoom: number,
): { x: number; y: number } {
  const scale = zoom * PIXELS_PER_INCH
  return {
    x: (clientX - bounds.left - pan.x) / scale,
    y: (clientY - bounds.top - pan.y) / scale,
  }
}

export function clampZoom(zoom: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, zoom))
}

export function zoomAroundPoint(
  currentZoom: number,
  nextZoom: number,
  pan: { x: number; y: number },
  screenX: number,
  screenY: number,
): { zoom: number; pan: { x: number; y: number } } {
  const oldScale = currentZoom * PIXELS_PER_INCH
  const newScale = nextZoom * PIXELS_PER_INCH
  const worldX = (screenX - pan.x) / oldScale
  const worldY = (screenY - pan.y) / oldScale
  return {
    zoom: nextZoom,
    pan: {
      x: screenX - worldX * newScale,
      y: screenY - worldY * newScale,
    },
  }
}
