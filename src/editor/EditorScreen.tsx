import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { FloorplanCanvas } from '../canvas/FloorplanCanvas'
import { getCatalogItem } from '../catalog/furniture'
import { FurnitureSvg } from '../furniture/FurnitureVisual'
import { useEditorStore } from '../state/editorStore'
import { Inspector } from './Inspector'
import { LeftSidebar } from './LeftSidebar'
import { TopBar } from './TopBar'
import { ContextMenu, DeleteWallDialog } from './ContextMenu'
import { LayersPanel } from './LayersPanel'
import { dropCatalogItem, useEditorHotkeys } from './useEditorHotkeys'

const ThreeDView = lazy(() => import('../three/ThreeDView'))

export function EditorScreen() {
  useEditorHotkeys()
  const displayMode = useEditorStore((state) => state.displayMode)
  const libraryDrag = useEditorStore((state) => state.libraryDrag)
  const setLibraryDrag = useEditorStore((state) => state.setLibraryDrag)
  const dragTypeRef = useRef<string | null>(null)
  const is3d = displayMode === '3d'

  useEffect(() => {
    dragTypeRef.current = libraryDrag?.type ?? null
  }, [libraryDrag])

  useEffect(() => {
    const onUp = (event: PointerEvent) => {
      if (useEditorStore.getState().displayMode === '3d') return
      const type = dragTypeRef.current
      if (!type) return
      dropCatalogItem(type, event.clientX, event.clientY)
      setLibraryDrag(null)
    }
    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [setLibraryDrag])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className={`absolute inset-0 ${is3d ? 'invisible pointer-events-none' : ''}`}>
        <FloorplanCanvas />
      </div>
      {is3d ? (
        <Suspense fallback={<div className="absolute inset-0 bg-[#f1ece4]" />}>
          <ThreeDView />
        </Suspense>
      ) : null}
      <div data-plane-panel="true">
        <TopBar />
      </div>
      {is3d ? null : (
        <>
          <div data-plane-panel="true">
            <LeftSidebar />
          </div>
          <div data-plane-panel="true">
            <Inspector />
          </div>
          {libraryDrag ? <DragGhost type={libraryDrag.type} x={libraryDrag.clientX} y={libraryDrag.clientY} /> : null}
          <LayersPanel />
          <ContextMenu />
          <DeleteWallDialog />
        </>
      )}
    </div>
  )
}

function DragGhost({ type, x, y }: { type: string; x: number; y: number }) {
  const item = getCatalogItem(type)
  const [pos, setPos] = useState({ x, y })

  useEffect(() => {
    const onMove = (event: PointerEvent) => setPos({ x: event.clientX, y: event.clientY })
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  if (!item) return null
  return (
    <div
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white/80 p-2 shadow-[0_10px_30px_rgba(44,42,38,0.12)]"
      style={{ left: pos.x, top: pos.y }}
    >
      <FurnitureSvg
        renderer={item.renderer}
        width={item.width}
        depth={item.depth}
        color={item.color}
        shape={item.shape}
        shapeData={item.shapeData}
        className="h-14 w-14"
      />
    </div>
  )
}
