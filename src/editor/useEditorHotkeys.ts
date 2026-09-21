import { useEffect } from 'react'
import { addMeasurement, attachedCount } from '../architecture/plan'
import { clientToWorld } from '../canvas/coords'
import { getCatalogItem } from '../catalog/furniture'
import { copySelection, cutSelection, deleteSelection, duplicateSelection, nudgeSelection, pasteClipboard } from './clipboard'
import { NUDGE_INCHES, NUDGE_LARGE_INCHES } from './constants'
import { furnitureFromCatalog } from '../data/sample'
import { useEditorStore } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'
import { isTextInput } from '../utils/time'
import type { BuildTool } from '../types/spatial'

export function useEditorHotkeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextInput(event.target)) return
      const editor = useEditorStore.getState()
      const projects = useProjectStore.getState()
      if (editor.displayMode === '3d') {
        if (event.key === 'Shift') editor.setModifiers({ shiftHeld: true })
        const meta = event.metaKey || event.ctrlKey
        if (meta && event.key.toLowerCase() === 'z') {
          event.preventDefault()
          if (event.shiftKey) editor.redo()
          else editor.undo()
        }
        return
      }
      if (event.key === ' ' && !event.repeat) {
        event.preventDefault()
        editor.setModifiers({ spaceHeld: true })
      }
      if (event.key === 'Alt') editor.setModifiers({ altHeld: true })
      if (event.key === 'Shift') editor.setModifiers({ shiftHeld: true })

      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) editor.redo()
        else editor.undo()
        return
      }

      if (meta && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        copySelection()
        return
      }
      if (meta && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        pasteClipboard()
        return
      }
      if (meta && event.key.toLowerCase() === 'x') {
        event.preventDefault()
        cutSelection()
        return
      }
      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateSelection()
        return
      }

      if (!meta) {
        const toolMap: Record<string, BuildTool> = {
          v: 'select',
          w: 'wall',
          d: 'door',
          n: 'window',
          m: 'measure',
        }
        const nextTool = toolMap[event.key.toLowerCase()]
        if (nextTool) {
          event.preventDefault()
          editor.setTool(nextTool)
          return
        }
      }

      if (event.key === 'Enter' && editor.measureTemp && editor.projectId && editor.layoutId) {
        event.preventDefault()
        editor.captureHistory()
        projects.updatePlan(editor.projectId, editor.layoutId, (plan) =>
          addMeasurement(plan, editor.measureTemp!.start, editor.measureTemp!.end),
        )
        editor.setMeasureTemp(null)
        return
      }

      const { projectId, layoutId, selection, selections } = editor
      if (!projectId || !layoutId) return
      const layout = projects.projects
        .find((project) => project.id === projectId)
        ?.layouts.find((item) => item.id === layoutId)
      if (!layout) return

      if ((event.key === 'Backspace' || event.key === 'Delete') && (selection || selections.length > 0)) {
        event.preventDefault()
        if (selections.length === 1 && selection?.kind === 'wall') {
          const count = attachedCount(layout.plan, selection.id)
          const wall = layout.plan.walls.find((item) => item.id === selection.id)
          if (wall?.locked || layout.plan.architectureLocked) return
          if (count > 0) {
            editor.setPendingWallDelete({ wallId: selection.id, count })
            return
          }
        }
        deleteSelection()
        return
      }

      if (event.key === 'Escape') {
        editor.cancelTool()
        editor.setLayoutMenuOpen(false)
        editor.setContextMenu(null)
        return
      }

      const arrows: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      }
      const dir = arrows[event.key]
      if (dir) {
        const step = event.shiftKey ? NUDGE_LARGE_INCHES : NUDGE_INCHES
        if (nudgeSelection(dir.x * step, dir.y * step)) event.preventDefault()
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      const editor = useEditorStore.getState()
      if (event.key === ' ') editor.setModifiers({ spaceHeld: false })
      if (event.key === 'Alt') editor.setModifiers({ altHeld: false })
      if (event.key === 'Shift') editor.setModifiers({ shiftHeld: false })
    }

    const onBlur = () => {
      useEditorStore.getState().setModifiers({ shiftHeld: false, altHeld: false, spaceHeld: false })
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}

export function dropCatalogItem(type: string, clientX: number, clientY: number) {
  const hit = document.elementFromPoint(clientX, clientY)
  if (hit?.closest('[data-plane-panel]')) return
  const canvas = document.querySelector('[data-plane-canvas]')
  if (!canvas || !hit?.closest('[data-plane-canvas]')) return

  const editor = useEditorStore.getState()
  const { projectId, layoutId, zoom, pan } = editor
  if (!projectId || !layoutId) return
  const layout = useProjectStore
    .getState()
    .projects.find((project) => project.id === projectId)
    ?.layouts.find((item) => item.id === layoutId)
  const catalog = getCatalogItem(type)
  if (!layout || !catalog) return

  const bounds = canvas.getBoundingClientRect()
  const world = clientToWorld(clientX, clientY, bounds, pan, zoom)
  const x = world.x - catalog.width / 2
  const y = world.y - catalog.depth / 2
  const item = furnitureFromCatalog(type, x, y)
  if (!item) return
  editor.captureHistory()
  useProjectStore.getState().addFurniture(projectId, layoutId, item)
  editor.setSelection({ kind: 'furniture', id: item.id })
}
