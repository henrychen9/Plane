import { useEffect, useMemo } from 'react'
import { BoxGeometry, EdgesGeometry } from 'three'
import { inchesToSceneUnits } from '../utils/units'

const skipRaycast = () => {}

export function SelectionOutline({
  width,
  depth,
  height,
  selected,
  hovered,
  muted = false,
}: {
  width: number
  depth: number
  height: number
  selected: boolean
  hovered: boolean
  muted?: boolean
}) {
  const pad = inchesToSceneUnits(0.55)
  const w = inchesToSceneUnits(width) + pad
  const h = inchesToSceneUnits(Math.max(height, 0.4)) + pad * 0.45
  const d = inchesToSceneUnits(depth) + pad
  const geometry = useMemo(() => {
    const box = new BoxGeometry(w, h, d)
    const edges = new EdgesGeometry(box)
    box.dispose()
    return edges
  }, [w, h, d])

  useEffect(() => () => geometry.dispose(), [geometry])

  if (!selected && !hovered) return null

  return (
    <lineSegments position={[0, h / 2, 0]} raycast={skipRaycast}>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial
        color={selected ? '#2c2a26' : '#7a756e'}
        transparent
        opacity={selected ? (muted ? 0.42 : 0.9) : 0.4}
        depthTest={false}
      />
    </lineSegments>
  )
}
