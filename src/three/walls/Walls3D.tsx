import type { Door, Vertex, Wall, WindowOpening } from '../../types/spatial'
import { useEditorStore } from '../../state/editorStore'
import { useProjectStore } from '../../state/projectStore'
import { Wall3D } from './Wall3D'

const EMPTY_WALLS: Wall[] = []
const EMPTY_VERTICES: Vertex[] = []
const EMPTY_DOORS: Door[] = []
const EMPTY_WINDOWS: WindowOpening[] = []

export function useActiveWalls() {
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  const walls = useProjectStore((state) => {
    return (
      state.projects
        .find((project) => project.id === projectId)
        ?.layouts.find((item) => item.id === layoutId)?.plan.walls ?? EMPTY_WALLS
    )
  })
  const vertices = useProjectStore((state) => {
    return (
      state.projects
        .find((project) => project.id === projectId)
        ?.layouts.find((item) => item.id === layoutId)?.plan.vertices ?? EMPTY_VERTICES
    )
  })
  const doors = useProjectStore((state) => {
    return (
      state.projects
        .find((project) => project.id === projectId)
        ?.layouts.find((item) => item.id === layoutId)?.plan.doors ?? EMPTY_DOORS
    )
  })
  const windows = useProjectStore((state) => {
    return (
      state.projects
        .find((project) => project.id === projectId)
        ?.layouts.find((item) => item.id === layoutId)?.plan.windows ?? EMPTY_WINDOWS
    )
  })
  return { walls, vertices, doors, windows }
}

export function Walls3D() {
  const { walls, vertices, doors, windows } = useActiveWalls()

  return (
    <>
      {walls.map((wall) => (
        <Wall3D
          key={wall.id}
          wall={wall}
          vertices={vertices}
          doors={doors.filter((item) => item.wallId === wall.id)}
          windows={windows.filter((item) => item.wallId === wall.id)}
        />
      ))}
    </>
  )
}
