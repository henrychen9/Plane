import type { FurnitureRendererId } from '../../../types/spatial'

export type ProceduralKind =
  | 'bed'
  | 'sofa'
  | 'armchair'
  | 'chair'
  | 'desk-chair'
  | 'desk'
  | 'table'
  | 'storage'
  | 'bookshelf'
  | 'nightstand'
  | 'rug'
  | 'plant'
  | 'lamp'
  | 'generic'

export type FurnitureRenderDefinition = {
  renderer: 'procedural' | 'model'
  proceduralType: ProceduralKind
  modelPath?: string
  rotationOffsetY?: number
}

export function catalogRendererToProcedural(renderer: FurnitureRendererId | undefined): ProceduralKind {
  switch (renderer) {
    case 'bed':
      return 'bed'
    case 'sofa':
      return 'sofa'
    case 'armchair':
      return 'armchair'
    case 'desk-chair':
      return 'desk-chair'
    case 'dining-chair':
      return 'chair'
    case 'desk':
      return 'desk'
    case 'table':
      return 'table'
    case 'dresser':
      return 'storage'
    case 'bookshelf':
      return 'bookshelf'
    case 'nightstand':
      return 'nightstand'
    case 'rug':
      return 'rug'
    case 'plant':
      return 'plant'
    case 'lamp':
      return 'lamp'
    default:
      return 'generic'
  }
}
