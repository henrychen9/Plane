import type { ReactNode } from 'react'
import type { FurnitureItem } from '../../types/spatial'
import { SpatialPickGroup } from './SpatialPickGroup'
import { useFurnitureDrag } from './useFurnitureDrag'

export function FurnitureDragController({
  item,
  selected,
  children,
}: {
  item: FurnitureItem
  selected: boolean
  children: ReactNode
}) {
  const { onPointerDown } = useFurnitureDrag(item)
  return (
    <SpatialPickGroup
      width={item.width}
      depth={item.depth}
      height={item.height}
      selected={selected}
      pickId={`furniture:${item.id}`}
      onPointerDown={onPointerDown}
    >
      {children}
    </SpatialPickGroup>
  )
}
