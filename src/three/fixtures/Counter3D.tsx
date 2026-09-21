import { inchesToSceneUnits } from '../utils/units'
import { FurnitureBox } from '../furniture/primitives'
import type { Fixture } from '../../types/spatial'
import { fixtureColor, fixtureHeightInches } from './fixtureGeometry'

export function Counter3D({ fixture, wallHeight }: { fixture: Fixture; wallHeight: number }) {
  const height = fixtureHeightInches(fixture, wallHeight)
  const h = inchesToSceneUnits(height)
  return (
    <FurnitureBox
      position={[0, h / 2, 0]}
      size={[inchesToSceneUnits(fixture.width), h, inchesToSceneUnits(fixture.depth)]}
      color={fixtureColor(fixture.type)}
      roughness={0.78}
      metalness={0.04}
    />
  )
}
