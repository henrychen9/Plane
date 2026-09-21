import type { FurnitureItem } from '../../../types/spatial'
import type { LocalBox } from '../furnitureGeometry'
import { localBoxTransform } from '../furnitureGeometry'
import type { MaterialPreset } from '../materials'
import { FurnitureBox, FurnitureRoundedBox } from '../primitives'

export function BoxPart({
  item,
  box,
  color,
  preset,
  radius,
  castShadow = true,
  receiveShadow = true,
}: {
  item: Pick<FurnitureItem, 'width' | 'depth'>
  box: LocalBox
  color: string
  preset?: MaterialPreset
  radius?: number
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const transform = localBoxTransform(item, box)
  if (radius && radius > 0) {
    return (
      <FurnitureRoundedBox
        position={transform.position}
        size={transform.size}
        color={color}
        preset={preset}
        radius={radius}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      />
    )
  }
  return (
    <FurnitureBox
      position={transform.position}
      size={transform.size}
      color={color}
      preset={preset}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}
