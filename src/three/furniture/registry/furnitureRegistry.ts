import { getCatalogItem } from '../../../catalog/furniture'
import type { FurnitureItem } from '../../../types/spatial'
import { catalogRendererToProcedural, type FurnitureRenderDefinition, type ProceduralKind } from './furnitureModelTypes'

const TYPE_OVERRIDES: Partial<Record<string, Partial<FurnitureRenderDefinition>>> = {
  'side-table': {
    renderer: 'model',
    modelPath: 'models/furniture/side-table.gltf',
    rotationOffsetY: 0,
  },
}

function defaultDefinition(item: FurnitureItem): FurnitureRenderDefinition {
  const catalog = getCatalogItem(item.type)
  const proceduralType: ProceduralKind = catalogRendererToProcedural(catalog?.renderer)
  return {
    renderer: 'procedural',
    proceduralType,
  }
}

export function resolveFurnitureRender(item: FurnitureItem): FurnitureRenderDefinition {
  const base = defaultDefinition(item)
  const override = TYPE_OVERRIDES[item.type]
  if (!override) return base
  return {
    ...base,
    ...override,
    proceduralType: override.proceduralType ?? base.proceduralType,
  }
}

export function listedModelPaths(): string[] {
  const paths = new Set<string>()
  for (const override of Object.values(TYPE_OVERRIDES)) {
    if (override?.renderer === 'model' && override.modelPath) paths.add(override.modelPath)
  }
  return [...paths]
}
