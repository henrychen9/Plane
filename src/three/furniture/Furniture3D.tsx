import type { FurnitureItem } from '../../types/spatial'
import { isSelected } from '../../editor/selection'
import { useEditorStore } from '../../state/editorStore'
import { useProjectStore } from '../../state/projectStore'
import { FurnitureItem3D } from './FurnitureItem3D'

const EMPTY_FURNITURE: FurnitureItem[] = []

export function useActiveFurniture() {
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  return useProjectStore((state) => {
    return (
      state.projects
        .find((project) => project.id === projectId)
        ?.layouts.find((item) => item.id === layoutId)?.furniture ?? EMPTY_FURNITURE
    )
  })
}

export function Furniture3D() {
  const furniture = useActiveFurniture()
  const selections = useEditorStore((state) => state.selections)

  return (
    <>
      {furniture.map((item) => (
        <FurnitureItem3D
          key={item.id}
          item={item}
          selected={isSelected(selections, 'furniture', item.id)}
        />
      ))}
    </>
  )
}
