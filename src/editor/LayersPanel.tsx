import { useState } from 'react'
import { useEditorStore } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'
import type { LayerId } from '../types/spatial'

const LAYER_ITEMS: { id: LayerId; label: string }[] = [
  { id: 'architecture', label: 'Architecture' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'grid', label: 'Grid' },
]

export function LayersPanel() {
  const [open, setOpen] = useState(false)
  const layers = useEditorStore((state) => state.layers)
  const setLayer = useEditorStore((state) => state.setLayer)
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const layout = useProjectStore((state) =>
    state.projects.find((project) => project.id === projectId)?.layouts.find((item) => item.id === layoutId),
  )
  const updatePlan = useProjectStore((state) => state.updatePlan)
  const locked = Boolean(layout?.plan.architectureLocked)

  if (!projectId || !layoutId || !layout) return null

  return (
    <div className="pointer-events-auto absolute bottom-6 left-3 z-20" data-plane-panel="true">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="panel flex h-10 items-center rounded-xl px-3 text-[12px] text-ink-soft"
      >
        Layers
      </button>
      {open ? (
        <div className="panel absolute bottom-12 left-0 w-48 rounded-xl p-2">
          {LAYER_ITEMS.map((item) => (
            <label key={item.id} className="flex h-8 items-center justify-between rounded-md px-2 text-[13px] text-ink hover:bg-paper-deep">
              {item.label}
              <input
                type="checkbox"
                checked={layers[item.id]}
                onChange={(event) => setLayer(item.id, event.target.checked)}
              />
            </label>
          ))}
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            onClick={() => {
              captureHistory()
              updatePlan(projectId, layoutId, (plan) => ({ ...plan, architectureLocked: !plan.architectureLocked }))
            }}
            className="flex h-8 w-full items-center rounded-md px-2 text-[13px] text-ink hover:bg-paper-deep"
          >
            {locked ? 'Unlock architecture' : 'Lock architecture'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
