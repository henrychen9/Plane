import { setAllRoomsFloorMaterial } from '../architecture/plan'
import { useEditorStore, type CameraMode } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'
import { FLOOR_STYLES, parseFloorStyle, type FloorStyleId } from './floorStyles'
import { useActiveRooms } from './useActiveFloorPolygons'

const MODES: { id: CameraMode; label: string }[] = [
  { id: 'orbit', label: 'Orbit' },
  { id: 'top', label: 'Top' },
  { id: 'walk', label: 'Walk' },
]

export function ViewportChrome() {
  const cameraMode = useEditorStore((state) => state.cameraMode)
  const setCameraMode = useEditorStore((state) => state.setCameraMode)
  const requestThreeFit = useEditorStore((state) => state.requestThreeFit)
  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const updatePlan = useProjectStore((state) => state.updatePlan)
  const rooms = useActiveRooms()
  const floorStyle = parseFloorStyle(rooms[0]?.floorMaterial)

  const setFloor = (next: FloorStyleId) => {
    if (!projectId || !layoutId) return
    captureHistory()
    updatePlan(projectId, layoutId, (plan) => setAllRoomsFloorMaterial(plan, next))
  }

  return (
    <>
      <div className="pointer-events-auto absolute right-3 top-20 z-20 flex flex-col items-end gap-2">
        <div className="flex rounded-md border border-line bg-white/85 p-0.5 shadow-[0_8px_20px_rgba(44,42,38,0.06)]" role="group" aria-label="Camera mode">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              aria-pressed={cameraMode === mode.id}
              onClick={() => setCameraMode(mode.id)}
              className={`h-7 rounded px-2 text-[11px] font-medium tracking-[0.12em] transition ${
                cameraMode === mode.id
                  ? 'bg-white text-ink shadow-[0_1px_2px_rgba(44,42,38,0.08)]'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        {cameraMode === 'walk' ? null : (
          <button
            type="button"
            onClick={requestThreeFit}
            className="h-7 rounded-md border border-line bg-white/85 px-2.5 text-[11px] font-medium tracking-[0.08em] text-ink-soft shadow-[0_8px_20px_rgba(44,42,38,0.06)] hover:text-ink"
          >
            Fit View
          </button>
        )}
        {rooms.length > 0 ? (
          <label className="flex items-center gap-2 rounded-md border border-line bg-white/85 px-2 py-1 text-[11px] text-ink-soft shadow-[0_8px_20px_rgba(44,42,38,0.06)]">
            <span className="tracking-[0.08em]">Floor</span>
            <select
              value={floorStyle}
              onChange={(event) => setFloor(event.target.value as FloorStyleId)}
              className="h-6 rounded border border-line bg-white/80 px-1 text-[11px] text-ink outline-none"
            >
              {FLOOR_STYLES.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {cameraMode === 'walk' ? (
        <p className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/70 px-3 py-1 text-[12px] text-ink-soft shadow-[0_6px_18px_rgba(44,42,38,0.06)]">
          WASD to move · drag to look · Esc to exit
        </p>
      ) : null}
    </>
  )
}
