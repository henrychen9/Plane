import { inchesToSceneUnits } from '../utils/units'
import { FurnitureBox } from '../furniture/primitives'
import type { Fixture } from '../../types/spatial'
import { fixtureColor, fixtureHeightInches } from './fixtureGeometry'

export function Radiator3D({ fixture, wallHeight }: { fixture: Fixture; wallHeight: number }) {
  const height = fixtureHeightInches(fixture, wallHeight)
  const width = inchesToSceneUnits(fixture.width)
  const depth = inchesToSceneUnits(fixture.depth)
  const bodyH = inchesToSceneUnits(height)
  const finCount = Math.min(18, Math.max(3, Math.floor(fixture.width / 4)))
  const finH = inchesToSceneUnits(height * 0.9)
  const finT = inchesToSceneUnits(0.35)
  const finD = inchesToSceneUnits(fixture.depth * 0.78)

  return (
    <>
      <FurnitureBox
        position={[0, bodyH / 2, 0]}
        size={[width, bodyH, depth]}
        color={fixtureColor('radiator')}
        roughness={0.42}
        metalness={0.28}
      />
      {Array.from({ length: finCount }, (_, index) => {
        const xInches = 4 + (index * (fixture.width - 8)) / Math.max(1, finCount - 1) - fixture.width / 2
        return (
          <FurnitureBox
            key={index}
            position={[inchesToSceneUnits(xInches), inchesToSceneUnits(height * 0.52), 0]}
            size={[finT, finH, finD]}
            color="#6f6a63"
            roughness={0.38}
            metalness={0.32}
            castShadow={false}
          />
        )
      })}
    </>
  )
}
