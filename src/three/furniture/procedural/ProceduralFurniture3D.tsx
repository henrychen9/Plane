import type { FurnitureItem } from '../../../types/spatial'
import type { ProceduralKind } from '../registry/furnitureModelTypes'
import { Bed3D } from './Bed3D'
import { Chair3D } from './Chair3D'
import { Desk3D } from './Desk3D'
import { Table3D } from './Table3D'
import { GenericFurniture3D } from './GenericFurniture3D'
import { Lamp3D } from './Lamp3D'
import { Plant3D } from './Plant3D'
import { Rug3D } from './Rug3D'
import { Sofa3D } from './Sofa3D'
import { Storage3D } from './Storage3D'

export function ProceduralFurniture3D({ item, kind }: { item: FurnitureItem; kind: ProceduralKind }) {
  switch (kind) {
    case 'bed':
      return <Bed3D item={item} />
    case 'sofa':
      return <Sofa3D item={item} />
    case 'armchair':
      return <Sofa3D item={item} compact />
    case 'chair':
      return <Chair3D item={item} />
    case 'desk-chair':
      return <Chair3D item={item} office />
    case 'desk':
      return <Desk3D item={item} />
    case 'table':
      return <Table3D item={item} />
    case 'storage':
      return <Storage3D item={item} variant="dresser" />
    case 'bookshelf':
      return <Storage3D item={item} variant="bookshelf" />
    case 'nightstand':
      return <Storage3D item={item} variant="nightstand" />
    case 'rug':
      return <Rug3D item={item} />
    case 'plant':
      return <Plant3D item={item} />
    case 'lamp':
      return <Lamp3D item={item} />
    default:
      return <GenericFurniture3D item={item} />
  }
}
