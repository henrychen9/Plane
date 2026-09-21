import { useMemo } from 'react'
import type { DetectedRoom, Point } from '../types/spatial'
import { useEditorStore } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'

const EMPTY_ROOMS: DetectedRoom[] = []
const EMPTY_POLYGONS: Point[][] = []

export function useActiveRooms(): DetectedRoom[] {
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  return useProjectStore((state) => {
    return (
      state.projects
        .find((project) => project.id === projectId)
        ?.layouts.find((item) => item.id === layoutId)?.plan.rooms ?? EMPTY_ROOMS
    )
  })
}

export function useActiveFloorPolygons(): Point[][] {
  const rooms = useActiveRooms()
  return useMemo(
    () => (rooms.length === 0 ? EMPTY_POLYGONS : rooms.map((room) => room.polygon)),
    [rooms],
  )
}
