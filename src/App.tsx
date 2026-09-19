import { SpacesScreen } from './components/spaces/SpacesScreen'
import { EditorScreen } from './editor/EditorScreen'
import { useEditorStore } from './state/editorStore'
import { useHasHydrated } from './state/useHasHydrated'

export default function App() {
  const hydrated = useHasHydrated()
  const view = useEditorStore((state) => state.view)

  if (!hydrated) {
    return <div className="app-boot" />
  }

  return (
    <div className="h-svh w-full">
      {view === 'editor' ? <EditorScreen /> : <SpacesScreen />}
    </div>
  )
}
