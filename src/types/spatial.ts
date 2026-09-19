export interface Point {
  x: number
  y: number
}

export interface Room {
  width: number
  depth: number
  wallHeight: number
}

export type FurnitureShape = 'rectangle' | 'circle' | 'oval' | 'lShape'

export interface FurnitureShapeData {
  returnLength?: number
  thickness?: number
  returnSide?: 'left' | 'right'
}

export interface FurnitureItem {
  id: string
  type: string
  name: string
  x: number
  y: number
  width: number
  depth: number
  height: number
  rotation: number
  color: string
  locked: boolean
  shape?: FurnitureShape
  shapeData?: FurnitureShapeData
}

export type WallType = 'exterior' | 'interior' | 'partition'

export interface Vertex {
  id: string
  x: number
  y: number
}

export interface Wall {
  id: string
  startVertexId: string
  endVertexId: string
  start: Point
  end: Point
  thickness: number
  height: number
  type: WallType
  locked: boolean
}

export type DoorType = 'hinged' | 'sliding' | 'pocket'
export type HingeSide = 'start' | 'end'
export type SwingDirection = 'left' | 'right'

export interface Door {
  id: string
  wallId: string
  offset: number
  width: number
  type: DoorType
  hingeSide: HingeSide
  swingDirection: SwingDirection
}

export interface WindowOpening {
  id: string
  wallId: string
  offset: number
  width: number
  sillHeight: number
  height: number
}

export type OutletType = 'standard' | 'double' | 'gfci' | 'floor'

export interface Outlet {
  id: string
  wallId: string
  offset: number
  type: OutletType
}

export interface SwitchDevice {
  id: string
  wallId: string
  offset: number
}

export type FixtureType =
  | 'column'
  | 'radiator'
  | 'hvac-vent'
  | 'built-in-cabinet'
  | 'kitchen-counter'

export type ColumnShape = 'rectangle' | 'circle'

export interface Fixture {
  id: string
  type: FixtureType
  name: string
  x: number
  y: number
  width: number
  depth: number
  rotation: number
  locked: boolean
  shape?: ColumnShape
}

export interface DetectedRoom {
  id: string
  name: string
  wallIds: string[]
  polygon: Point[]
  area: number
  perimeter: number
  floorMaterial?: string
}

export interface PinnedMeasurement {
  id: string
  start: Point
  end: Point
}

export interface ReferenceImage {
  id: string
  opacity: number
  scale: number
  rotation: number
  x: number
  y: number
  locked: boolean
  hidden: boolean
  nativeWidth: number
  nativeHeight: number
}

export interface FloorPlan {
  id: string
  vertices: Vertex[]
  walls: Wall[]
  doors: Door[]
  windows: WindowOpening[]
  outlets: Outlet[]
  switches: SwitchDevice[]
  fixtures: Fixture[]
  rooms: DetectedRoom[]
  measurements: PinnedMeasurement[]
  reference?: ReferenceImage
  architectureLocked?: boolean
  showWallLengths?: boolean
}

export interface Layout {
  id: string
  name: string
  room: Room
  furniture: FurnitureItem[]
  plan: FloorPlan
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  layouts: Layout[]
}

export type FurnitureCategory =
  | 'beds'
  | 'sofas'
  | 'chairs'
  | 'tables'
  | 'desks'
  | 'storage'
  | 'rugs'
  | 'lighting'
  | 'plants'

export type FurnitureRendererId =
  | 'bed'
  | 'sofa'
  | 'armchair'
  | 'desk-chair'
  | 'dining-chair'
  | 'table'
  | 'desk'
  | 'dresser'
  | 'bookshelf'
  | 'nightstand'
  | 'rug'
  | 'lamp'
  | 'plant'
  | 'generic'

export interface CatalogItem {
  type: string
  name: string
  category: FurnitureCategory
  width: number
  depth: number
  height: number
  color: string
  renderer: FurnitureRendererId
  shape?: FurnitureShape
  shapeData?: FurnitureShapeData
}

export type AlignmentGuide = {
  axis: 'x' | 'y'
  position: number
}

export type Rect = {
  x: number
  y: number
  width: number
  depth: number
}

export type BuildTool =
  | 'select'
  | 'wall'
  | 'door'
  | 'window'
  | 'outlet'
  | 'switch'
  | 'column'
  | 'radiator'
  | 'vent'
  | 'cabinet'
  | 'counter'
  | 'measure'
  | 'calibrate'

export type LayerId = 'architecture' | 'furniture' | 'electrical' | 'measurements' | 'grid'

export type SelectionKind =
  | 'furniture'
  | 'wall'
  | 'door'
  | 'window'
  | 'outlet'
  | 'switch'
  | 'fixture'
  | 'room'
  | 'measurement'

export type EditorSelection = {
  kind: SelectionKind
  id: string
}

export type CollisionKind = 'wall' | 'outside' | 'door' | 'column'
