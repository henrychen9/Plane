import { inchesToSceneUnits } from '../utils/units'
import { FurnitureBox, FurnitureCylinder } from '../furniture/primitives'
import type { Fixture } from '../../types/spatial'
import { fixtureColor, fixtureHeightInches } from './fixtureGeometry'

export function Column3D({ fixture, wallHeight }: { fixture: Fixture; wallHeight: number }) {
  const height = fixtureHeightInches(fixture, wallHeight)
  const h = inchesToSceneUnits(height)
  const color = fixtureColor('column')

  if (fixture.shape === 'circle') {
    const radius = inchesToSceneUnits(Math.min(fixture.width, fixture.depth) / 2)
    const sx = fixture.width / Math.min(fixture.width, fixture.depth)
    const sz = fixture.depth / Math.min(fixture.width, fixture.depth)
    return (
      <FurnitureCylinder
        position={[0, h / 2, 0]}
        radius={radius}
        height={h}
        color={color}
        scale={sx === 1 && sz === 1 ? undefined : [sx, 1, sz]}
        roughness={0.86}
        metalness={0.02}
      />
    )
  }

  return (
    <FurnitureBox
      position={[0, h / 2, 0]}
      size={[inchesToSceneUnits(fixture.width), h, inchesToSceneUnits(fixture.depth)]}
      color={color}
      roughness={0.86}
      metalness={0.02}
    />
  )
}
