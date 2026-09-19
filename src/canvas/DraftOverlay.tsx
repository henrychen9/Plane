import { Circle, Group, Line, Text } from 'react-konva'
import type { FloorPlan } from '../types/spatial'
import { useEditorStore } from '../state/editorStore'
import { formatLength } from '../utils/units'
import { MeasureLine } from './OpeningNodes'
import { WALL_THICKNESS } from '../editor/constants'

export function DraftOverlay({ scale, plan }: { scale: number; plan: FloorPlan }) {
  const wallDraft = useEditorStore((state) => state.wallDraft)
  const wallPreview = useEditorStore((state) => state.wallPreview)
  const measureDraft = useEditorStore((state) => state.measureDraft)
  const measurePreview = useEditorStore((state) => state.measurePreview)
  const measureTemp = useEditorStore((state) => state.measureTemp)
  const calibrateDraft = useEditorStore((state) => state.calibrateDraft)
  const guides = useEditorStore((state) => state.guides)
  const inv = 1 / scale
  const last = wallDraft[wallDraft.length - 1]

  return (
    <Group listening={false}>
      {guides.map((guide, index) =>
        guide.axis === 'x' ? (
          <Line key={`g-${index}`} points={[guide.position, -200, guide.position, 8000]} stroke="#7b93a6" strokeWidth={inv} />
        ) : (
          <Line key={`g-${index}`} points={[-200, guide.position, 8000, guide.position]} stroke="#7b93a6" strokeWidth={inv} />
        ),
      )}
      {wallDraft.map((point, index) => (
        <Circle key={`d-${index}`} x={point.x} y={point.y} radius={2.4 * inv} fill="#2c2a26" />
      ))}
      {last && wallPreview ? (
        <>
          <Line
            points={[last.x, last.y, wallPreview.x, wallPreview.y]}
            stroke="#2c2a26"
            strokeWidth={plan.walls[0]?.thickness ?? WALL_THICKNESS}
            opacity={0.4}
          />
          <Text
            x={(last.x + wallPreview.x) / 2 - 40}
            y={(last.y + wallPreview.y) / 2 - 14 * inv}
            width={80}
            align="center"
            text={formatLength(Math.hypot(wallPreview.x - last.x, wallPreview.y - last.y))}
            fontSize={12 * inv}
            fontFamily="Inter Tight"
            fill="#2c2a26"
          />
        </>
      ) : null}
      {measureDraft && measurePreview ? (
        <MeasureLine start={measureDraft} end={measurePreview} scale={scale} />
      ) : null}
      {measureTemp ? <MeasureLine start={measureTemp.start} end={measureTemp.end} scale={scale} selected /> : null}
      {calibrateDraft.map((point, index) => (
        <Circle key={`c-${index}`} x={point.x} y={point.y} radius={2.8 * inv} fill="#7b93a6" />
      ))}
    </Group>
  )
}
