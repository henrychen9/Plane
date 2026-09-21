import type { Fixture } from '../../types/spatial'
import { DEFAULT_WALL_HEIGHT } from '../../editor/constants'
import { isSelected } from '../../editor/selection'
import { useEditorStore } from '../../state/editorStore'
import { useProjectStore } from '../../state/projectStore'
import { FixtureItem3D } from './FixtureItem3D'

const EMPTY_FIXTURES: Fixture[] = []

export function useActiveFixtures() {
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  return useProjectStore((state) => {
    return (
      state.projects
        .find((project) => project.id === projectId)
        ?.layouts.find((item) => item.id === layoutId)?.plan.fixtures ?? EMPTY_FIXTURES
    )
  })
}

export function useActiveWallHeight() {
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  return useProjectStore((state) => {
    return (
      state.projects
        .find((project) => project.id === projectId)
        ?.layouts.find((item) => item.id === layoutId)?.room.wallHeight || DEFAULT_WALL_HEIGHT
    )
  })
}

export function Fixtures3D() {
  const fixtures = useActiveFixtures()
  const wallHeight = useActiveWallHeight()
  const selections = useEditorStore((state) => state.selections)

  return (
    <>
      {fixtures.map((fixture) => (
        <FixtureItem3D
          key={fixture.id}
          fixture={fixture}
          wallHeight={wallHeight}
          selected={isSelected(selections, 'fixture', fixture.id)}
        />
      ))}
    </>
  )
}
