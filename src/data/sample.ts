import { rectToPlan } from '../architecture/plan'
import { getCatalogItem } from '../catalog/furniture'
import { DEFAULT_WALL_HEIGHT } from '../editor/constants'
import type { FurnitureItem, Layout, Project } from '../types/spatial'
import { createId } from '../utils/id'

export function createChicagoStudio(): Project {
  const now = new Date().toISOString()
  const layoutId = createId('lay')
  const room = { width: 180, depth: 264, wallHeight: DEFAULT_WALL_HEIGHT }

  const furniture: FurnitureItem[] = [
    item('large-rug', 42, 114),
    item('queen-bed', 16, 16),
    item('dresser', 92, 16),
    item('large-plant', 156, 18),
    item('writing-desk', 16, 210),
    item('desk-chair', 28, 186),
    item('sofa-2', 90, 210, 180),
    item('coffee-table', 103, 168),
  ]

  const layout: Layout = {
    id: layoutId,
    name: 'Layout A',
    room,
    furniture,
    plan: rectToPlan(room.width, room.depth, room.wallHeight),
  }

  return {
    id: createId('prj'),
    name: 'Chicago Studio',
    createdAt: now,
    updatedAt: now,
    layouts: [layout],
  }
}

function item(type: string, x: number, y: number, rotation = 0): FurnitureItem {
  const catalog = getCatalogItem(type)
  if (!catalog) {
    throw new Error(`Unknown furniture type: ${type}`)
  }
  return {
    id: createId('fur'),
    type: catalog.type,
    name: catalog.name,
    x,
    y,
    width: catalog.width,
    depth: catalog.depth,
    height: catalog.height,
    rotation,
    color: catalog.color,
    locked: false,
    shape: catalog.shape ?? 'rectangle',
    shapeData: catalog.shapeData,
  }
}

export function emptyLayout(name: string, width: number, depth: number): Layout {
  return {
    id: createId('lay'),
    name,
    room: { width, depth, wallHeight: DEFAULT_WALL_HEIGHT },
    furniture: [],
    plan: rectToPlan(width, depth, DEFAULT_WALL_HEIGHT),
  }
}

export function nextLayoutName(existing: string[]): string {
  const used = new Set(existing)
  for (let i = 0; i < 26; i += 1) {
    const name = `Layout ${String.fromCharCode(65 + i)}`
    if (!used.has(name)) return name
  }
  let n = 27
  while (used.has(`Layout ${n}`)) n += 1
  return `Layout ${n}`
}

export function furnitureFromCatalog(
  type: string,
  x: number,
  y: number,
): FurnitureItem | null {
  const catalog = getCatalogItem(type)
  if (!catalog) return null
  return {
    id: createId('fur'),
    type: catalog.type,
    name: catalog.name,
    x,
    y,
    width: catalog.width,
    depth: catalog.depth,
    height: catalog.height,
    rotation: 0,
    color: catalog.color,
    locked: false,
    shape: catalog.shape ?? 'rectangle',
    shapeData: catalog.shapeData,
  }
}
