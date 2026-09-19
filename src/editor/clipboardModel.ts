import { CLIPBOARD_KEY } from './constants'
import type {
  Door,
  Fixture,
  FurnitureItem,
  Outlet,
  Point,
  SwitchDevice,
  Vertex,
  Wall,
  WindowOpening,
} from '../types/spatial'

export type ClipboardPayload = {
  copiedAt: number
  sourceProjectId: string
  sourceLayoutId: string
  relativeOrigin: Point
  bounds: { width: number; depth: number }
  furniture: FurnitureItem[]
  fixtures: Fixture[]
  vertices: Vertex[]
  walls: Wall[]
  doors: Door[]
  windows: WindowOpening[]
  outlets: Outlet[]
  switches: SwitchDevice[]
  skippedMounted: number
  pasteCount: number
}

export function loadClipboard(): ClipboardPayload | null {
  try {
    const raw = sessionStorage.getItem(CLIPBOARD_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ClipboardPayload
  } catch {
    return null
  }
}

export function persistClipboard(payload: ClipboardPayload | null) {
  try {
    if (!payload) sessionStorage.removeItem(CLIPBOARD_KEY)
    else sessionStorage.setItem(CLIPBOARD_KEY, JSON.stringify(payload))
  } catch {
    /* private mode */
  }
}
