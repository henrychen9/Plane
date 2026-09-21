import { memo, useMemo } from 'react'
import type { Fixture } from '../../types/spatial'
import { Column3D } from './Column3D'
import { Counter3D } from './Counter3D'
import { Radiator3D } from './Radiator3D'
import { Vent3D } from './Vent3D'
import { fixtureSnapshot, fixtureWorldTransform } from './fixtureGeometry'
import { FixtureDragController } from '../interaction/FixtureDragController'

export const FixtureItem3D = memo(
  function FixtureItem3D({
    fixture,
    wallHeight,
    selected,
  }: {
    fixture: Fixture
    wallHeight: number
    selected: boolean
  }) {
    const snapshot = fixtureSnapshot(fixture, wallHeight)
    const transform = useMemo(() => fixtureWorldTransform(fixture), [snapshot, fixture])

    return (
      <group
        position={transform.position}
        rotation={transform.rotation}
        userData={{ fixtureId: fixture.id, fixtureType: fixture.type }}
      >
        <FixtureDragController fixture={fixture} wallHeight={wallHeight} selected={selected}>
          {fixture.type === 'radiator' ? (
            <Radiator3D fixture={fixture} wallHeight={wallHeight} />
          ) : fixture.type === 'column' ? (
            <Column3D fixture={fixture} wallHeight={wallHeight} />
          ) : fixture.type === 'hvac-vent' ? (
            <Vent3D fixture={fixture} wallHeight={wallHeight} />
          ) : (
            <Counter3D fixture={fixture} wallHeight={wallHeight} />
          )}
        </FixtureDragController>
      </group>
    )
  },
  (prev, next) =>
    fixtureSnapshot(prev.fixture, prev.wallHeight) === fixtureSnapshot(next.fixture, next.wallHeight) &&
    prev.selected === next.selected,
)
