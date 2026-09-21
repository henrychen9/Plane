import { darken, lighten } from '../../../utils/color'
import type { FurnitureItem } from '../../../types/spatial'
import { inchesToSceneUnits } from '../../utils/units'
import { FurnitureCylinder, FurnitureSphere } from '../primitives'

const LEAVES = [
  { x: 0.02, y: 0.62, z: -0.04, s: 1 },
  { x: 0.12, y: 0.78, z: 0.06, s: 0.72 },
  { x: -0.1, y: 0.74, z: 0.08, s: 0.68 },
  { x: 0.08, y: 0.9, z: -0.08, s: 0.58 },
  { x: -0.06, y: 0.88, z: -0.1, s: 0.55 },
]

export function Plant3D({ item }: { item: FurnitureItem }) {
  const minSide = Math.min(item.width, item.depth)
  const potH = item.height * 0.26
  const stemH = item.height * 0.38
  const potR = inchesToSceneUnits(minSide * 0.26)
  const stemR = inchesToSceneUnits(minSide * 0.035)
  const leafR = inchesToSceneUnits(minSide * 0.22)

  return (
    <>
      <FurnitureCylinder
        position={[0, inchesToSceneUnits(potH / 2), 0]}
        radius={potR}
        height={inchesToSceneUnits(potH)}
        color={darken(item.color, 0.42)}
        preset="ceramic"
      />
      <FurnitureCylinder
        position={[0, inchesToSceneUnits(potH + stemH / 2), 0]}
        radius={stemR}
        height={inchesToSceneUnits(stemH)}
        color={darken(item.color, 0.28)}
        preset="plantLeaf"
        castShadow={false}
      />
      {LEAVES.map((leaf, index) => (
        <FurnitureSphere
          key={index}
          position={[
            inchesToSceneUnits(minSide * leaf.x),
            inchesToSceneUnits(item.height * leaf.y),
            inchesToSceneUnits(minSide * leaf.z),
          ]}
          radius={leafR * leaf.s}
          scale={[1.15, 0.42, 0.85]}
          color={index % 2 === 0 ? item.color : lighten(item.color, 0.08)}
          preset="plantLeaf"
        />
      ))}
    </>
  )
}
