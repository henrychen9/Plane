import { darken, lighten } from '../../../utils/color'
import type { FurnitureItem } from '../../../types/spatial'
import { inchesToSceneUnits } from '../../utils/units'
import { FurnitureCone, FurnitureCylinder } from '../primitives'

export function Lamp3D({ item }: { item: FurnitureItem }) {
  const minSide = Math.min(item.width, item.depth)
  const baseH = Math.max(0.8, item.height * 0.06)
  const shadeH = item.height * (item.height > 40 ? 0.22 : 0.3)
  const stemH = Math.max(item.height - shadeH - baseH, 2)
  const baseR = inchesToSceneUnits(minSide * 0.28)
  const stemR = inchesToSceneUnits(minSide * 0.055)
  const shadeR = inchesToSceneUnits(minSide * 0.36)

  return (
    <>
      <FurnitureCylinder
        position={[0, inchesToSceneUnits(baseH / 2), 0]}
        radius={baseR}
        height={inchesToSceneUnits(baseH)}
        color={darken(item.color, 0.3)}
        preset="metal"
      />
      <FurnitureCylinder
        position={[0, inchesToSceneUnits(baseH + stemH / 2), 0]}
        radius={stemR}
        height={inchesToSceneUnits(stemH)}
        color={darken(item.color, 0.22)}
        preset="metal"
      />
      <FurnitureCone
        position={[0, inchesToSceneUnits(item.height - shadeH / 2), 0]}
        radius={shadeR}
        height={inchesToSceneUnits(shadeH)}
        rotation={[Math.PI, 0, 0]}
        color={lighten(item.color, 0.04)}
        preset="fabric"
      />
    </>
  )
}
