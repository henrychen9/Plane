export const FLOOR_STYLE_IDS = ['lightWood', 'darkWood', 'warmOak', 'concrete', 'whiteTile'] as const

export type FloorStyleId = (typeof FLOOR_STYLE_IDS)[number]

export type FloorStyle = {
  id: FloorStyleId
  label: string
  color: string
  roughness: number
  metalness: number
}

export const FLOOR_STYLES: FloorStyle[] = [
  { id: 'lightWood', label: 'Light Wood', color: '#d9c5a3', roughness: 0.54, metalness: 0.02 },
  { id: 'darkWood', label: 'Dark Wood', color: '#6a4a33', roughness: 0.48, metalness: 0.03 },
  { id: 'warmOak', label: 'Warm Oak', color: '#c49258', roughness: 0.5, metalness: 0.03 },
  { id: 'concrete', label: 'Concrete', color: '#c4c0b8', roughness: 0.86, metalness: 0 },
  { id: 'whiteTile', label: 'White Tile', color: '#ece8e1', roughness: 0.26, metalness: 0.04 },
]

const STYLE_BY_ID = new Map(FLOOR_STYLES.map((style) => [style.id, style]))

const ALIASES: Record<string, FloorStyleId> = {
  lightwood: 'lightWood',
  light: 'lightWood',
  wood: 'lightWood',
  hardwood: 'warmOak',
  darkwood: 'darkWood',
  dark: 'darkWood',
  walnut: 'darkWood',
  warmoak: 'warmOak',
  oak: 'warmOak',
  concrete: 'concrete',
  cement: 'concrete',
  stone: 'concrete',
  whitetile: 'whiteTile',
  tile: 'whiteTile',
  marble: 'whiteTile',
  ceramic: 'whiteTile',
}

export const DEFAULT_FLOOR_STYLE: FloorStyleId = 'lightWood'

function normalizeFloorKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

export function parseFloorStyle(value: string | undefined): FloorStyleId {
  if (!value) return DEFAULT_FLOOR_STYLE
  if ((FLOOR_STYLE_IDS as readonly string[]).includes(value)) return value as FloorStyleId
  return ALIASES[normalizeFloorKey(value)] ?? DEFAULT_FLOOR_STYLE
}

export function floorStyleOf(value: string | undefined): FloorStyle {
  return STYLE_BY_ID.get(parseFloorStyle(value)) ?? FLOOR_STYLES[0]
}

export const WALL_COLOR = '#f2eee6'
export const WALL_ROUGHNESS = 0.88
export const GROUND_COLOR = '#e5dfd4'
export const SCENE_BACKGROUND = '#f3efe8'
