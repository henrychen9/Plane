import { Box3, Color, Mesh, Object3D, Vector3 } from 'three'
import type { FurnitureItem } from '../../../types/spatial'
import { inchesToSceneUnits } from '../../utils/units'

export function furnitureModelUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}${path.replace(/^\//, '')}`
}

const skipRaycast = () => {}

export function normalizeModelToItem(root: Object3D, item: FurnitureItem): Object3D {
  root.updateMatrixWorld(true)
  const native = new Box3().setFromObject(root)
  const size = native.getSize(new Vector3())
  const sx = size.x > 1e-6 ? inchesToSceneUnits(item.width) / size.x : 1
  const sy = size.y > 1e-6 ? inchesToSceneUnits(Math.max(item.height, 0.25)) / size.y : 1
  const sz = size.z > 1e-6 ? inchesToSceneUnits(item.depth) / size.z : 1
  root.scale.set(sx, sy, sz)
  root.updateMatrixWorld(true)

  const scaled = new Box3().setFromObject(root)
  const center = scaled.getCenter(new Vector3())
  root.position.x += -center.x
  root.position.y += -scaled.min.y
  root.position.z += -center.z

  const tint = new Color(item.color)
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    obj.castShadow = true
    obj.receiveShadow = true
    obj.raycast = skipRaycast
    if (!obj.material) return
    const source = Array.isArray(obj.material) ? obj.material : [obj.material]
    const cloned = source.map((material) => {
      const next = material.clone()
      if ('color' in next && next.color instanceof Color) next.color.copy(tint)
      return next
    })
    obj.material = Array.isArray(obj.material) ? cloned : cloned[0]
  })

  return root
}
