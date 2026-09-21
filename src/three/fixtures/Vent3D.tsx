import { inchesToSceneUnits } from '../utils/units'
import { FurnitureBox } from '../furniture/primitives'
import type { Fixture } from '../../types/spatial'
import { fixtureColor, fixtureHeightInches } from './fixtureGeometry'

export function Vent3D({ fixture, wallHeight }: { fixture: Fixture; wallHeight: number }) {
  const height = fixtureHeightInches(fixture, wallHeight)
  const w = inchesToSceneUnits(fixture.width)
  const d = inchesToSceneUnits(fixture.depth)
  const h = inchesToSceneUnits(height)

  return (
    <>
      <FurnitureBox
        position={[0, h / 2, 0]}
        size={[w, h, d]}
        color={fixtureColor('hvac-vent')}
        roughness={0.55}
        metalness={0.18}
        castShadow={false}
      />
      {Array.from({ length: 3 }, (_, index) => {
        const zInches = ((index + 1) / 4) * fixture.depth - fixture.depth / 2
        return (
          <FurnitureBox
            key={index}
            position={[0, inchesToSceneUnits(height + 0.12), inchesToSceneUnits(zInches)]}
            size={[inchesToSceneUnits(fixture.width - 2), inchesToSceneUnits(0.18), inchesToSceneUnits(0.35)]}
            color="#8d877e"
            roughness={0.5}
            metalness={0.22}
            castShadow={false}
          />
        )
      })}
    </>
  )
}
