export const PIXELS_PER_INCH = 2
export const GRID_INCHES = 6
export const MIN_ZOOM = 0.28
export const MAX_ZOOM = 3.2
export const MIN_FURNITURE_SIZE = 8
export const WALL_THICKNESS = 4.5
export const DUPLICATE_OFFSET = 12
export const NUDGE_INCHES = 1
export const NUDGE_LARGE_INCHES = 6
export const ROTATION_SNAP = 15
export const HISTORY_LIMIT = 60
export const DEFAULT_WALL_HEIGHT = 96

export const PANEL = {
  left: 268,
  right: 276,
  top: 76,
  bottom: 96,
} as const

export const FIT_LABEL_PAD = 40

export const STORAGE_KEY = 'plane.projects.v1'
export const CLIPBOARD_KEY = 'plane.clipboard.v1'

/** Copy pre-rename storage so existing browser data survives the product rename. */
export function adoptLegacyStorage() {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const legacy = localStorage.getItem('within.projects.v1')
      if (legacy) localStorage.setItem(STORAGE_KEY, legacy)
    }
    if (!sessionStorage.getItem(CLIPBOARD_KEY)) {
      const legacy = sessionStorage.getItem('within.clipboard.v1')
      if (legacy) sessionStorage.setItem(CLIPBOARD_KEY, legacy)
    }
  } catch {
    /* private mode */
  }
}
