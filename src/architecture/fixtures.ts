import type { Fixture, FixtureType } from '../types/spatial'
import { createId } from '../utils/id'

export const FIXTURE_DEFAULTS: Record<
  FixtureType,
  { name: string; width: number; depth: number; locked: boolean; shape?: 'rectangle' | 'circle' }
> = {
  column: { name: 'Column', width: 12, depth: 12, locked: false, shape: 'rectangle' },
  radiator: { name: 'Radiator', width: 36, depth: 8, locked: false },
  'hvac-vent': { name: 'HVAC Vent', width: 14, depth: 8, locked: false },
  'built-in-cabinet': { name: 'Built-in Cabinet', width: 36, depth: 24, locked: false },
  'kitchen-counter': { name: 'Kitchen Counter', width: 48, depth: 24, locked: false },
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
