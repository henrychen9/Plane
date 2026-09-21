import type { ReactNode } from 'react'
import type { Fixture } from '../../types/spatial'
import { fixtureHeightInches } from '../fixtures/fixtureGeometry'
import { SpatialPickGroup } from './SpatialPickGroup'
import { useFixtureDrag } from './useFixtureDrag'

export function FixtureDragController({
  fixture,
  wallHeight,
  selected,
  children,
}: {
  fixture: Fixture
  wallHeight: number
  selected: boolean
  children: ReactNode
}) {
  const { onPointerDown } = useFixtureDrag(fixture)
  return (
    <SpatialPickGroup
      width={fixture.width}
      depth={fixture.depth}
      height={fixtureHeightInches(fixture, wallHeight)}
      selected={selected}
      pickId={`fixture:${fixture.id}`}
      onPointerDown={onPointerDown}
    >
      {children}
    </SpatialPickGroup>
  )
}
