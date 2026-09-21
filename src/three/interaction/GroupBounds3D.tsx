import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { can3DGroupDrag, freeSelections } from '../../editor/selection'
import { selectionBounds } from '../../editor/groupMove'
import { useEditorStore } from '../../state/editorStore'
import { useProjectStore } from '../../state/projectStore'
import { inchesToSceneUnits } from '../utils/units'

function skipRaycast() {}

export function GroupBounds3D() {
  const cameraMode = useEditorStore((state) => state.cameraMode)
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  const selections = useEditorStore((state) => state.selections)
  const layout = useProjectStore((state) => {
    return (
      state.projects.find((project) => project.id === projectId)?.layouts.find((item) => item.id === layoutId) ??
      null
    )
  })

  const bounds = useMemo(() => {
    if (cameraMode === 'walk' || !layout || !can3DGroupDrag(selections)) return null
    return selectionBounds(layout, freeSelections(selections))
  }, [cameraMode, layout, selections])

  const geometry = useMemo(() => {
    if (!bounds) return null
    const w = inchesToSceneUnits(bounds.width)
    const d = inchesToSceneUnits(bounds.depth)
    const hw = w / 2
    const hd = d / 2
    const y = inchesToSceneUnits(0.4)
    const positions = new Float32Array([
      -hw, y, -hd, hw, y, -hd, hw, y, -hd, hw, y, hd, hw, y, hd, -hw, y, hd, -hw, y, hd, -hw, y, -hd,
    ])
    const next = new BufferGeometry()
    next.setAttribute('position', new Float32BufferAttribute(positions, 3))
    return next
  }, [bounds])

  useEffect(() => () => geometry?.dispose(), [geometry])

  if (!bounds || !geometry) return null

  return (
    <lineSegments
      position={[inchesToSceneUnits(bounds.x + bounds.width / 2), 0, inchesToSceneUnits(bounds.y + bounds.depth / 2)]}
      raycast={skipRaycast}
      renderOrder={12}
    >
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#2c2a26" transparent opacity={0.28} depthTest={false} />
    </lineSegments>
  )
}
