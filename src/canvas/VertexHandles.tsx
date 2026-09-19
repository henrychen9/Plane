import { memo, useRef } from 'react'
import { Circle } from 'react-konva'
import { snapVertexPoint } from '../architecture/drawSnap'
import { mergeVertexIfNearby, setVertexPosition } from '../architecture/vertices'
import { PIXELS_PER_INCH } from '../editor/constants'
import { useEditorStore } from '../state/editorStore'
import { getLayout, useProjectStore } from '../state/projectStore'
import type { FloorPlan } from '../types/spatial'
import { snapThresholdInches } from '../utils/snap'
import { startStageDrag, stageWorld } from './stageDrag'

export const VertexHandles = memo(function VertexHandles({
  projectId,
  layoutId,
  plan,
  wallId,
  locked,
  scale,
}: {
  projectId: string
  layoutId: string
  plan: FloorPlan
  wallId: string
  locked: boolean
  scale: number
}) {
  const wall = plan.walls.find((item) => item.id === wallId)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const setSelection = useEditorStore((state) => state.setSelection)
  const updatePlan = useProjectStore((state) => state.updatePlan)
  const origin = useRef({ x: 0, y: 0 })
  if (!wall) return null

  const inv = 1 / scale
  const ids = [...new Set([wall.startVertexId, wall.endVertexId])]

  return (
    <>
      {ids.map((vertexId) => {
        const vertex = (plan.vertices ?? []).find((item) => item.id === vertexId)
        if (!vertex) return null
        return (
          <Circle
            key={vertexId}
            x={vertex.x}
            y={vertex.y}
            radius={4.2 * inv}
            fill="#fffdf9"
            stroke="#2c2a26"
            strokeWidth={1.1 * inv}
            onMouseDown={(event) => {
              event.cancelBubble = true
              setSelection({ kind: 'wall', id: wall.id })
              if (locked || event.evt.button !== 0) return
              const stage = event.target.getStage()
              if (!stage) return
              captureHistory()
              origin.current = { x: vertex.x, y: vertex.y }
              startStageDrag(
                stage,
                () => {
                  const world = stageWorld(stage)
                  if (!world) return
                  const editor = useEditorStore.getState()
                  const currentPlan = getLayout(projectId, layoutId)?.plan ?? plan
                  const snap = snapVertexPoint(world, origin.current, currentPlan, {
                    enabled: !editor.altHeld,
                    grid: editor.gridEnabled && !editor.altHeld,
                    threshold: snapThresholdInches(editor.zoom, PIXELS_PER_INCH),
                    shift: editor.shiftHeld,
                    excludeVertexId: vertexId,
                  })
                  updatePlan(projectId, layoutId, (current) => setVertexPosition(current, vertexId, snap.point), {
                    rebuild: false,
                  })
                },
                () => {
                  const threshold = snapThresholdInches(useEditorStore.getState().zoom, PIXELS_PER_INCH)
                  updatePlan(projectId, layoutId, (current) => mergeVertexIfNearby(current, vertexId, threshold))
                },
              )
            }}
          />
        )
      })}
    </>
  )
})
