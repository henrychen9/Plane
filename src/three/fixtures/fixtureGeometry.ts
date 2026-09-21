import { DEFAULT_WALL_HEIGHT } from '../../editor/constants'
import type { Fixture, FixtureType } from '../../types/spatial'
import { inchesToSceneUnits } from '../utils/units'
import type { Vec3 } from '../furniture/furnitureGeometry'

export type FixtureWorldTransform = {
  position: Vec3
  rotation: Vec3
}

export function fixtureWorldTransform(fixture: Fixture): FixtureWorldTransform {
  return {
    position: [
      inchesToSceneUnits(fixture.x + fixture.width / 2),
      0,
      inchesToSceneUnits(fixture.y + fixture.depth / 2),
    ],
    rotation: [0, -((fixture.rotation || 0) * Math.PI) / 180, 0],
  }
}

export function fixtureHeightInches(fixture: Fixture, wallHeight = DEFAULT_WALL_HEIGHT): number {
  switch (fixture.type) {
    case 'column':
      return Math.max(12, wallHeight)
    case 'radiator':
      return 24
    case 'hvac-vent':
      return 2
    case 'built-in-cabinet':
      return 36
    case 'kitchen-counter':
      return 36
  }
}

export function fixtureColor(type: FixtureType): string {
  switch (type) {
    case 'radiator':
      return '#8d877e'
    case 'column':
      return '#d8d0c3'
    case 'hvac-vent':
      return '#b7b1a6'
    case 'built-in-cabinet':
      return '#c4b9a6'
    case 'kitchen-counter':
      return '#d2c8b6'
  }
}

export function fixtureSnapshot(fixture: Fixture, wallHeight: number): string {
  return [
    fixture.id,
    fixture.type,
    fixture.x,
    fixture.y,
    fixture.width,
    fixture.depth,
    fixture.rotation,
    fixture.shape ?? '',
    wallHeight,
  ].join(':')
}
