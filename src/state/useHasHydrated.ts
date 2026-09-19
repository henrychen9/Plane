import { useEffect, useState } from 'react'
import { migrateLayout } from '../architecture/plan'
import { createChicagoStudio } from '../data/sample'
import { useProjectStore } from './projectStore'

export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useProjectStore.persist.hasHydrated())

  useEffect(() => {
    const finish = () => {
      const state = useProjectStore.getState()
      if (!state.seeded) {
        useProjectStore.setState({
          projects: [createChicagoStudio()],
          seeded: true,
        })
      } else {
        useProjectStore.setState({
          projects: state.projects.map((project) => ({
            ...project,
            layouts: project.layouts.map((layout) => migrateLayout(layout)),
          })),
        })
      }
      setHydrated(true)
    }

    if (useProjectStore.persist.hasHydrated()) {
      finish()
      return
    }

    const unsub = useProjectStore.persist.onFinishHydration(finish)
    return unsub
  }, [])

  return hydrated
}
