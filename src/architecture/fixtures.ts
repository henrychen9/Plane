import type { Fixture, FixtureType } from '../types/spatial'
import { createId } from '../utils/id'

export const FIXTURE_DEFAULTS: Record<
  FixtureType,
  { name: string; width: number; depth: number; locked: boolean; shape?: 'rectangle' | 'circle' }
> = {
  column: { name: 'Column', width: 12, depth: 12, locked: true, shape: 'rectangle' },
  radiator: { name: 'Radiator', width: 36, depth: 8, locked: true },
  'hvac-vent': { name: 'HVAC Vent', width: 14, depth: 8, locked: true },
  'built-in-cabinet': { name: 'Built-in Cabinet', width: 36, depth: 24, locked: true },
  'kitchen-counter': { name: 'Kitchen Counter', width: 48, depth: 24, locked: true },
}

export function fixtureFromType(type: FixtureType, x: number, y: number): Fixture {
  const defaults = FIXTURE_DEFAULTS[type]
  return {
    id: createId('fix'),
    type,
    name: defaults.name,
    x,
    y,
    width: defaults.width,
    depth: defaults.depth,
    rotation: 0,
    locked: defaults.locked,
    shape: defaults.shape,
  }
}
