import type Konva from 'konva'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Line, Rect, Stage, Transformer } from 'react-konva'
import { snapDrawPoint, snapMeasurePoint } from '../architecture/drawSnap'
import { distance, normalizeRect } from '../architecture/geometry'
import { fixtureFromType } from '../architecture/fixtures'
import { snapFixture } from '../architecture/fixtureSnap'
import { hitsInRect } from '../architecture/marquee'
import {
  addDoor,
  addOutlet,
  addSwitch,
  addWall,
  addWindow,
  joinOrSplitAtPoint,
  layoutFitBounds,
  nearestWall,
} from '../architecture/plan'
import { pickTop } from '../architecture/pick'
import { getCatalogItem } from '../catalog/furniture'
import { furnitureShapeOf } from '../furniture/shapes'
import {
  FIT_LABEL_PAD,
  GRID_INCHES,
  MAX_ZOOM,
  MIN_FURNITURE_SIZE,
  MIN_ZOOM,
  PANEL,
  PIXELS_PER_INCH,
  ROTATION_SNAP,
} from '../editor/constants'
import { selectionBounds } from '../editor/groupMove'
import { canRigidGroupDrag, isSelected, uniqueSelections } from '../editor/selection'
import { beginRigidGroupDrag } from './groupDrag'
import { useEditorStore } from '../state/editorStore'
import { useProjectStore } from '../state/projectStore'
import type { BuildTool, FixtureType, FurnitureItem, Point } from '../types/spatial'
import { snapRotation } from '../utils/geometry'
import { snapFurniture, snapThresholdInches } from '../utils/snap'
import { ArchitectureLayer, OverlayLayer } from './ArchitectureLayer'
import { DraftOverlay } from './DraftOverlay'
import { FurnitureNode } from './FurnitureNode'
import { pointerToWorld } from './pointer'
import { ReferenceImageNode } from './ReferenceImageNode'
import { ZoomControls } from './ZoomControls'
import { clampZoom, zoomAroundPoint } from './coords'
import { parseLength } from '../utils/units'

const OPENING_TOOLS: BuildTool[] = ['door', 'window', 'outlet', 'switch']
const FIXTURE_TOOLS: Partial<Record<BuildTool, FixtureType>> = {
  column: 'column',
  radiator: 'radiator',
  vent: 'hvac-vent',
  cabinet: 'built-in-cabinet',
  counter: 'kitchen-counter',
}

export function FloorplanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const nodesRef = useRef<Record<string, Konva.Group>>({})
  const panDrag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [calibratePrompt, setCalibratePrompt] = useState<{ a: Point; b: Point } | null>(null)
  const [calibrateValue, setCalibrateValue] = useState('10 ft')

  const projectId = useEditorStore((state) => state.projectId)
  const layoutId = useEditorStore((state) => state.layoutId)
  const selection = useEditorStore((state) => state.selection)
  const selections = useEditorStore((state) => state.selections)
  const marquee = useEditorStore((state) => state.marquee)
  const tool = useEditorStore((state) => state.tool)
  const zoom = useEditorStore((state) => state.zoom)
  const pan = useEditorStore((state) => state.pan)
  const gridEnabled = useEditorStore((state) => state.gridEnabled)
  const layers = useEditorStore((state) => state.layers)
  const altHeld = useEditorStore((state) => state.altHeld)
  const shiftHeld = useEditorStore((state) => state.shiftHeld)
  const spaceHeld = useEditorStore((state) => state.spaceHeld)
  const isPanning = useEditorStore((state) => state.isPanning)
  const draggingId = useEditorStore((state) => state.draggingId)
  const fitNonce = useEditorStore((state) => state.fitNonce)
  const wallDraft = useEditorStore((state) => state.wallDraft)
  const hoverHint = useEditorStore((state) => state.hoverHint)
  const measureTemp = useEditorStore((state) => state.measureTemp)
  const setSelection = useEditorStore((state) => state.setSelection)
  const setSelections = useEditorStore((state) => state.setSelections)
  const selectObject = useEditorStore((state) => state.selectObject)
  const setMarquee = useEditorStore((state) => state.setMarquee)
  const setPointerWorld = useEditorStore((state) => state.setPointerWorld)
  const setPointerOverCanvas = useEditorStore((state) => state.setPointerOverCanvas)
  const setViewport = useEditorStore((state) => state.setViewport)
  const setPanning = useEditorStore((state) => state.setPanning)
  const setDraggingId = useEditorStore((state) => state.setDraggingId)
  const setGuides = useEditorStore((state) => state.setGuides)
  const captureHistory = useEditorStore((state) => state.captureHistory)
  const requestFit = useEditorStore((state) => state.requestFit)
  const setGridEnabled = useEditorStore((state) => state.setGridEnabled)
  const setWallDraft = useEditorStore((state) => state.setWallDraft)
  const setWallPreview = useEditorStore((state) => state.setWallPreview)
  const setMeasureDraft = useEditorStore((state) => state.setMeasureDraft)
  const setMeasurePreview = useEditorStore((state) => state.setMeasurePreview)
  const setMeasureTemp = useEditorStore((state) => state.setMeasureTemp)
  const setCalibrateDraft = useEditorStore((state) => state.setCalibrateDraft)
  const setHoverHint = useEditorStore((state) => state.setHoverHint)
  const setTool = useEditorStore((state) => state.setTool)

  const layout = useProjectStore((state) =>
    state.projects.find((project) => project.id === projectId)?.layouts.find((item) => item.id === layoutId),
  )
  const updateFurniture = useProjectStore((state) => state.updateFurniture)
  const updatePlan = useProjectStore((state) => state.updatePlan)
  const addFixture = useProjectStore((state) => state.addFixture)

  const room = layout?.room
  const furniture = layout?.furniture ?? []
  const plan = layout?.plan
  const scale = zoom * PIXELS_PER_INCH
  const selectedFurniture =
    selections.length === 1 && selection?.kind === 'furniture'
      ? furniture.find((item) => item.id === selection.id)
      : undefined
  const selectedShape = selectedFurniture ? furnitureShapeOf(selectedFurniture) : 'rectangle'
  const groupBox = layout && selections.length > 1 ? selectionBounds(layout, selections) : null

  const bounds = layout ? layoutFitBounds(layout) : { x: 0, y: 0, width: 180, depth: 264 }

  const fitToBounds = useCallback(
    (next: { x: number; y: number; width: number; depth: number }, animated = false, dims = size) => {
      const left = dims.width > 980 ? PANEL.left : 16
      const right = dims.width > 980 ? PANEL.right : 16
      const top = PANEL.top
      const bottom = PANEL.bottom
      const labelPad = dims.width > 980 ? FIT_LABEL_PAD : 24
      const innerW = dims.width - left - right - labelPad
      const innerH = dims.height - top - bottom - labelPad
      if (innerW < 80 || innerH < 80) return
      const nextZoom = clampZoom(
        Math.min(innerW / (next.width * PIXELS_PER_INCH), innerH / (next.depth * PIXELS_PER_INCH)),
        MIN_ZOOM,
        MAX_ZOOM,
      )
      const drawnW = next.width * nextZoom * PIXELS_PER_INCH
      const drawnH = next.depth * nextZoom * PIXELS_PER_INCH
      const nextPan = {
        x: left + labelPad * 0.55 + (innerW - drawnW) / 2 - next.x * nextZoom * PIXELS_PER_INCH,
        y: top + labelPad * 0.45 + (innerH - drawnH) / 2 - next.y * nextZoom * PIXELS_PER_INCH,
      }
      if (!animated) {
        setViewport(nextZoom, nextPan)
        return
      }
      const startZoom = useEditorStore.getState().zoom
      const startPan = useEditorStore.getState().pan
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 180)
        const ease = 1 - (1 - t) ** 2
        setViewport(startZoom + (nextZoom - startZoom) * ease, {
          x: startPan.x + (nextPan.x - startPan.x) * ease,
          y: startPan.y + (nextPan.y - startPan.y) * ease,
        })
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    },
    [setViewport],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fittedKey = useRef('')

  useEffect(() => {
    if (!projectId || !layoutId || size.width < 240 || size.height < 200) return
    const key = `${projectId}:${layoutId}:${fitNonce}`
    if (fittedKey.current === key) return
    const current = useProjectStore
      .getState()
      .projects.find((project) => project.id === projectId)
      ?.layouts.find((item) => item.id === layoutId)
    if (!current) return
    fittedKey.current = key
    fitToBounds(layoutFitBounds(current), false, size)
  }, [fitNonce, fitToBounds, layoutId, projectId, size.height, size.width])

  useEffect(() => {
    const transformer = trRef.current
    if (!transformer) return
    const node = selectedFurniture ? nodesRef.current[selectedFurniture.id] : undefined
    transformer.nodes(node ? [node] : [])
    transformer.rotateEnabled(Boolean(selectedFurniture && !selectedFurniture.locked))
    transformer.enabledAnchors(
      selectedFurniture && !selectedFurniture.locked
        ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']
        : [],
    )
    transformer.getLayer()?.batchDraw()
  }, [selectedFurniture, furniture, zoom])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => event.preventDefault()
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const applyZoomAt = useCallback(
    (nextZoom: number, screenX: number, screenY: number) => {
      const current = useEditorStore.getState()
      const clamped = clampZoom(nextZoom, MIN_ZOOM, MAX_ZOOM)
      const next = zoomAroundPoint(current.zoom, clamped, current.pan, screenX, screenY)
      setViewport(next.zoom, next.pan)
    },
    [setViewport],
  )

  const zoomBy = useCallback(
    (factor: number) => {
      const current = useEditorStore.getState()
      applyZoomAt(current.zoom * factor, size.width / 2, size.height / 2)
    },
    [applyZoomAt, size.height, size.width],
  )

  const orderedFurniture = useMemo(() => {
    const items = [...furniture].sort((a, b) => zIndexFor(a) - zIndexFor(b))
    if (!draggingId) return items
    const dragging = items.find((item) => item.id === draggingId)
    if (!dragging) return items
    return [...items.filter((item) => item.id !== draggingId), dragging]
  }, [draggingId, furniture])

  const stroke = scale === 0 ? 1 : 1 / scale
  const ready = Boolean(projectId && layoutId && room && plan && size.width > 1)
  const cursor = spaceHeld || isPanning
    ? isPanning
      ? 'grabbing'
      : 'grab'
    : tool === 'select'
      ? 'default'
      : 'crosshair'

  const handleToolPoint = (world: Point, event: Konva.KonvaEventObject<MouseEvent>) => {
    if (!projectId || !layoutId || !plan) return
    const editor = useEditorStore.getState()
    const threshold = snapThresholdInches(editor.zoom, PIXELS_PER_INCH)
    const snapOpts = {
      enabled: !editor.altHeld,
      grid: editor.gridEnabled && !editor.altHeld,
      threshold,
      shift: editor.shiftHeld,
    }

    if (tool === 'wall') {
      const last = editor.wallDraft[editor.wallDraft.length - 1] ?? null
      const snapped = snapDrawPoint(world, last, plan, snapOpts)
      if (editor.wallDraft.length === 0) {
        setWallDraft([snapped.point])
        setGuides(snapped.guides)
        return
      }
      const first = editor.wallDraft[0]
      const closing = editor.wallDraft.length >= 3 && distance(snapped.point, first) <= threshold + 2
      const end = closing ? first : snapped.point
      captureHistory()
      updatePlan(projectId, layoutId, (current) => {
        let next = current
        const startJoin = joinOrSplitAtPoint(next, last!, threshold)
        next = startJoin.plan
        const endJoin = joinOrSplitAtPoint(next, end, threshold)
        next = endJoin.plan
        return addWall(next, startJoin.point, endJoin.point, {
          type: next.walls.length < 4 ? 'exterior' : 'interior',
        })
      })
      if (closing) {
        setWallDraft([])
        setWallPreview(null)
        setGuides([])
        setTool('select')
      } else {
        setWallDraft([...editor.wallDraft, end])
      }
      return
    }

    if (OPENING_TOOLS.includes(tool)) {
      const hit = nearestWall(plan, world, 16)
      if (!hit || plan.architectureLocked) return
      captureHistory()
      updatePlan(projectId, layoutId, (current) => {
        if (tool === 'door') return addDoor(current, hit.wall.id, hit.offset)
        if (tool === 'window') return addWindow(current, hit.wall.id, hit.offset)
        if (tool === 'outlet') return addOutlet(current, hit.wall.id, hit.offset)
        return addSwitch(current, hit.wall.id, hit.offset)
      })
      return
    }

        const fixtureType = FIXTURE_TOOLS[tool]
    if (fixtureType) {
      const raw = fixtureFromType(fixtureType, world.x, world.y)
      raw.x = world.x - raw.width / 2
      raw.y = world.y - raw.depth / 2
      const placed = snapFixture(raw, plan, snapOpts)
      captureHistory()
      addFixture(projectId, layoutId, placed)
      setSelection({ kind: 'fixture', id: placed.id })
      setTool('select')
      return
    }

    if (tool === 'measure') {
      const extras = [
        ...furniture,
        ...plan.fixtures,
      ]
      const point = snapMeasurePoint(world, plan, extras, { enabled: !editor.altHeld, threshold })
      if (!editor.measureDraft) {
        setMeasureDraft(point)
        setMeasureTemp(null)
        return
      }
      setMeasureTemp({ start: editor.measureDraft, end: point })
      setMeasureDraft(null)
      setMeasurePreview(null)
      return
    }

    if (tool === 'calibrate') {
      const extras = [...furniture, ...plan.fixtures]
      const point = snapMeasurePoint(world, plan, extras, { enabled: !editor.altHeld, threshold })
      const draft = editor.calibrateDraft
      if (draft.length === 0) {
        setCalibrateDraft([point])
        return
      }
      setCalibrateDraft([])
      setCalibratePrompt({ a: draft[0], b: point })
      return
    }

    if (tool === 'select') {
      const hit = pickTop(
        world,
        plan,
        furniture,
        threshold,
        {
          architecture: layers.architecture,
          furniture: layers.furniture,
          electrical: layers.electrical,
          measurements: layers.measurements,
        },
        event.evt.metaKey || event.evt.ctrlKey ? editor.selection : null,
      )
      if (event.evt.shiftKey && hit) {
        selectObject({ kind: hit.kind, id: hit.id }, true)
        return
      }
      setSelection(hit ? { kind: hit.kind, id: hit.id } : null)
    }
  }

  return (
    <div
      ref={containerRef}
      data-plane-canvas="true"
      className="relative h-full w-full overflow-hidden bg-[#f3efe8]"
      style={{ cursor }}
      onMouseEnter={() => setPointerOverCanvas(true)}
      onMouseLeave={() => {
        setPointerOverCanvas(false)
        setPointerWorld(null)
      }}
    >
      {ready && room && plan && projectId && layoutId ? (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          scaleX={scale}
          scaleY={scale}
          x={pan.x}
          y={pan.y}
          onContextMenu={(event) => event.evt.preventDefault()}
          onWheel={(event) => {
            event.evt.preventDefault()
            const stage = event.target.getStage()
            if (!stage) return
            if (event.evt.ctrlKey || event.evt.metaKey) {
              const pointer = stage.getPointerPosition()
              if (!pointer) return
              const factor = Math.exp(-event.evt.deltaY * 0.0025)
              applyZoomAt(useEditorStore.getState().zoom * factor, pointer.x, pointer.y)
              return
            }
            const current = useEditorStore.getState().pan
            setViewport(useEditorStore.getState().zoom, {
              x: current.x - event.evt.deltaX,
              y: current.y - event.evt.deltaY,
            })
          }}
          onMouseDown={(event) => {
            const target = event.target
            if (target.getParent()?.className === 'Transformer' || target.className === 'Transformer') return
            if (event.evt.button === 2) return
            if (event.evt.button === 1 || spaceHeld) {
              panDrag.current = {
                x: event.evt.clientX,
                y: event.evt.clientY,
                panX: useEditorStore.getState().pan.x,
                panY: useEditorStore.getState().pan.y,
              }
              setPanning(true)
              return
            }
            if (event.evt.button !== 0) return

            const overFurniture = Boolean(target.findAncestor?.('.furniture', true) || target.hasName?.('furniture'))
            const stage = target.getStage()
            const world = stage ? pointerToWorld(stage) : null
            if (!world) return
            setPointerWorld(world)

            if (tool !== 'select') {
              event.cancelBubble = true
              handleToolPoint(world, event)
              return
            }

            if (overFurniture) return
            if (target !== stage && tool === 'select') return

            setMarquee({ start: world, current: world })
          }}
          onMouseMove={(event) => {
            if (panDrag.current) {
              const dx = event.evt.clientX - panDrag.current.x
              const dy = event.evt.clientY - panDrag.current.y
              setViewport(useEditorStore.getState().zoom, {
                x: panDrag.current.panX + dx,
                y: panDrag.current.panY + dy,
              })
              return
            }
            const stage = event.target.getStage()
            const world = stage ? pointerToWorld(stage) : null
            if (world) setPointerWorld(world)
            const currentMarquee = useEditorStore.getState().marquee
            if (currentMarquee && world) {
              setMarquee({ ...currentMarquee, current: world })
              return
            }
            if (!world || !plan) return
            const editor = useEditorStore.getState()
            const threshold = snapThresholdInches(editor.zoom, PIXELS_PER_INCH)
            if (tool === 'wall') {
              const last = editor.wallDraft[editor.wallDraft.length - 1] ?? null
              const snapped = snapDrawPoint(world, last, plan, {
                enabled: !editor.altHeld,
                grid: editor.gridEnabled && !editor.altHeld,
                threshold,
                shift: editor.shiftHeld,
              })
              setWallPreview(snapped.point)
              setGuides(snapped.guides)
              if (last) setHoverHint(null)
            } else if (OPENING_TOOLS.includes(tool)) {
              setWallPreview(world)
            } else if (tool === 'measure' && editor.measureDraft) {
              const extras = [...furniture, ...plan.fixtures]
              setMeasurePreview(snapMeasurePoint(world, plan, extras, { enabled: !editor.altHeld, threshold }))
            }
          }}
          onMouseUp={(event) => {
            panDrag.current = null
            setPanning(false)
            const currentMarquee = useEditorStore.getState().marquee
            if (!currentMarquee || !plan) {
              setMarquee(null)
              return
            }
            const stage = event.target.getStage()
            const world = (stage ? pointerToWorld(stage) : null) ?? currentMarquee.current
            const screen = Math.hypot(
              (world.x - currentMarquee.start.x) * scale,
              (world.y - currentMarquee.start.y) * scale,
            )
            setMarquee(null)
            if (screen < 4) {
              handleToolPoint(world, event)
              return
            }
            const hits = hitsInRect(currentMarquee.start, world, plan, furniture, {
              architecture: layers.architecture,
              furniture: layers.furniture,
              electrical: layers.electrical,
            })
            if (event.evt.shiftKey) {
              setSelections(uniqueSelections([...useEditorStore.getState().selections, ...hits]))
            } else {
              setSelections(hits)
            }
          }}
          onMouseLeave={() => {
            panDrag.current = null
            setPanning(false)
          }}
        >
          <Layer>
            <ReferenceImageNode plan={plan} />
            <GridVisual bounds={bounds} enabled={gridEnabled && layers.grid} scale={scale} />
            <ArchitectureLayer
              projectId={projectId}
              layoutId={layoutId}
              plan={plan}
              scale={scale}
            />
            {layers.furniture
              ? orderedFurniture.map((item) => (
                  <FurnitureNode
                    key={item.id}
                    item={item}
                    dragging={draggingId === item.id}
                    allowNodeDrag={
                      !item.locked &&
                      !(isSelected(selections, 'furniture', item.id) && canRigidGroupDrag(selections))
                    }
                    onNode={(id, node) => {
                      if (node) nodesRef.current[id] = node
                      else delete nodesRef.current[id]
                    }}
                    onSelect={(id, toggle, cycle) => {
                      if (tool !== 'select') return
                      if (toggle) {
                        selectObject({ kind: 'furniture', id }, true)
                        return
                      }
                      if (cycle) {
                        const stage = stageRef.current
                        const world = stage ? pointerToWorld(stage) : null
                        if (world && plan) {
                          const hit = pickTop(world, plan, furniture, snapThresholdInches(zoom, PIXELS_PER_INCH), {
                            architecture: layers.architecture,
                            furniture: layers.furniture,
                            electrical: layers.electrical,
                            measurements: layers.measurements,
                          }, selection)
                          if (hit) setSelection({ kind: hit.kind, id: hit.id })
                          return
                        }
                      }
                      if (isSelected(useEditorStore.getState().selections, 'furniture', id) && canRigidGroupDrag(useEditorStore.getState().selections)) {
                        return
                      }
                      setSelection({ kind: 'furniture', id })
                    }}
                    onGroupDragStart={(id, stage) => {
                      const editor = useEditorStore.getState()
                      if (!isSelected(editor.selections, 'furniture', id) || !canRigidGroupDrag(editor.selections)) {
                        return false
                      }
                      return beginRigidGroupDrag({ projectId, layoutId, stage })
                    }}
                    onDragStart={(id, node) => {
                      const current = furniture.find((entry) => entry.id === id)
                      captureHistory()
                      setDraggingId(id)
                      node.position({ x: current ? current.x + current.width / 2 : node.x(), y: current ? current.y + current.depth / 2 : node.y() })
                    }}
                    onDragMove={(id, node) => {
                      const current = furniture.find((entry) => entry.id === id)
                      if (!current || !plan) return
                      const next = applyNodePosition(current, node, furniture, plan, room!, zoom, altHeld)
                      node.position({
                        x: next.x + current.width / 2,
                        y: next.y + current.depth / 2,
                      })
                      updateFurniture(projectId, layoutId, id, { x: next.x, y: next.y })
                      setGuides(next.guides)
                    }}
                    onDragEnd={(id, node) => {
                      const current = furniture.find((entry) => entry.id === id)
                      if (current && plan) {
                        const next = applyNodePosition(current, node, furniture, plan, room!, zoom, altHeld)
                        updateFurniture(projectId, layoutId, id, { x: next.x, y: next.y })
                      }
                      setDraggingId(null)
                      setGuides([])
                    }}
                  />
                ))
              : null}
            <OverlayLayer
              projectId={projectId}
              layoutId={layoutId}
              plan={plan}
              scale={scale}
            />
            <DraftOverlay scale={scale} plan={plan} />
            {groupBox ? (
              <Rect
                x={groupBox.x}
                y={groupBox.y}
                width={groupBox.width}
                height={groupBox.depth}
                stroke="rgba(44,42,38,0.32)"
                strokeWidth={stroke}
                fillEnabled={false}
                listening={false}
                perfectDrawEnabled={false}
              />
            ) : null}
            {marquee ? (
              <MarqueeRect start={marquee.start} current={marquee.current} stroke={stroke} />
            ) : null}
            <Transformer
              ref={trRef}
              keepRatio={shiftHeld || selectedShape === 'circle'}
              rotateEnabled={Boolean(selectedFurniture && !selectedFurniture.locked)}
              rotateAnchorOffset={26 / scale}
              rotateAnchorCursor="grab"
              anchorSize={Math.max(5 / scale, 3.4)}
              anchorCornerRadius={0.8 / scale}
              borderStroke="#2c2a26"
              borderStrokeWidth={stroke}
              borderDash={[]}
              anchorStroke="#2c2a26"
              anchorFill="#fffdf9"
              rotationSnaps={Array.from({ length: 24 }, (_, index) => index * ROTATION_SNAP)}
              boundBoxFunc={(oldBox, newBox) => {
                const min = MIN_FURNITURE_SIZE * scale
                if (Math.abs(newBox.width) < min || Math.abs(newBox.height) < min) return oldBox
                if (selectedShape === 'circle') {
                  const size = Math.max(Math.abs(newBox.width), Math.abs(newBox.height))
                  return { ...newBox, width: Math.sign(newBox.width || 1) * size, height: Math.sign(newBox.height || 1) * size }
                }
                return newBox
              }}
              onTransformStart={() => captureHistory()}
              onTransformEnd={() => {
                const node = trRef.current?.nodes()[0] as Konva.Group | undefined
                const current = selectedFurniture
                if (!node || !current || !projectId || !layoutId) return
                const scaleX = node.scaleX()
                const scaleY = node.scaleY()
                let width = Math.max(MIN_FURNITURE_SIZE, Math.abs(current.width * scaleX))
                let depth = Math.max(MIN_FURNITURE_SIZE, Math.abs(current.depth * scaleY))
                if (furnitureShapeOf(current) === 'circle') {
                  const diameter = Math.max(width, depth)
                  width = diameter
                  depth = diameter
                }
                node.scaleX(1)
                node.scaleY(1)
                const rotation = snapRotation(node.rotation(), ROTATION_SNAP)
                node.offsetX(width / 2)
                node.offsetY(depth / 2)
                node.position({ x: node.x(), y: node.y() })
                node.rotation(rotation)
                updateFurniture(projectId, layoutId, current.id, {
                  x: node.x() - width / 2,
                  y: node.y() - depth / 2,
                  width,
                  depth,
                  rotation,
                })
              }}
            />
          </Layer>
        </Stage>
      ) : null}
      {ready ? (
        <ZoomControls
          zoom={zoom}
          onZoomBy={zoomBy}
          onFit={() => (layout ? fitToBounds(layoutFitBounds(layout), true) : requestFit())}
          gridEnabled={gridEnabled}
          onToggleGrid={() => setGridEnabled(!gridEnabled)}
        />
      ) : null}
      {tool !== 'select' || wallDraft.length > 0 || measureTemp || hoverHint ? (
        <div className="pointer-events-none absolute left-1/2 top-[76px] z-20 -translate-x-1/2 rounded-full border border-line bg-[#fffdf9]/92 px-3 py-1 text-[12px] text-ink-soft shadow-[0_8px_24px_rgba(44,42,38,0.06)]">
          {hintFor(tool, wallDraft.length, Boolean(measureTemp), hoverHint)}
        </div>
      ) : null}
      {calibratePrompt && plan && projectId && layoutId ? (
        <div className="panel pointer-events-auto absolute left-1/2 top-24 z-40 w-72 -translate-x-1/2 rounded-xl p-4" data-plane-panel="true">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Calibrate scale</p>
          <p className="mt-2 text-[13px] text-ink-soft">Known distance between the two points</p>
          <input
            value={calibrateValue}
            onChange={(event) => setCalibrateValue(event.target.value)}
            className="mt-3 h-8 w-full rounded-md border border-line px-2 text-[13px] outline-none"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="h-8 rounded-md px-2 text-[13px] text-muted" onClick={() => setCalibratePrompt(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="h-8 rounded-md bg-ink px-3 text-[13px] text-white"
              onClick={() => {
                const known = parseLength(calibrateValue)
                const measured = distance(calibratePrompt.a, calibratePrompt.b)
                if (!known || measured < 0.5 || !plan.reference) {
                  setCalibratePrompt(null)
                  return
                }
                const factor = known / measured
                captureHistory()
                updatePlan(projectId, layoutId, (current) =>
                  current.reference
                    ? { ...current, reference: { ...current.reference, scale: current.reference.scale * factor } }
                    : current,
                )
                setCalibratePrompt(null)
                setTool('select')
              }}
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MarqueeRect({
  start,
  current,
  stroke,
}: {
  start: Point
  current: Point
  stroke: number
}) {
  const box = normalizeRect(start, current)
  return (
    <Rect
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.depth}
      fill="rgba(44,42,38,0.06)"
      stroke="rgba(44,42,38,0.38)"
      strokeWidth={stroke}
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}

function hintFor(tool: BuildTool, draftLen: number, hasMeasure: boolean, hover: string | null) {
  if (hover) return hover
  if (tool === 'wall') return draftLen === 0 ? 'Click to start a wall' : 'Click to place, Escape to finish'
  if (tool === 'door') return 'Click a wall to place a door'
  if (tool === 'window') return 'Click a wall to place a window'
  if (tool === 'outlet') return 'Click a wall to place an outlet'
  if (tool === 'switch') return 'Click a wall to place a switch'
  if (tool === 'measure') return hasMeasure ? 'Enter to pin · Escape to clear' : 'Click two points to measure'
  if (tool === 'calibrate') return 'Click two points on the reference image'
  if (tool === 'column') return 'Click to place a column'
  if (tool === 'radiator') return 'Click to place a radiator'
  if (tool === 'vent') return 'Click to place an HVAC vent'
  if (tool === 'cabinet') return 'Click to place a built-in cabinet'
  if (tool === 'counter') return 'Click to place a kitchen counter'
  return 'Select'
}

function zIndexFor(item: FurnitureItem): number {
  return getCatalogItem(item.type)?.category === 'rugs' ? 0 : 1
}

function applyNodePosition(
  item: FurnitureItem,
  node: Konva.Group,
  furniture: FurnitureItem[],
  plan: NonNullable<ReturnType<typeof useProjectStore.getState>['projects'][number]['layouts'][number]['plan']>,
  room: { width: number; depth: number; wallHeight: number },
  zoom: number,
  altHeld: boolean,
) {
  const proposed = {
    ...item,
    x: node.x() - item.width / 2,
    y: node.y() - item.depth / 2,
  }
  const others = [
    ...furniture.filter((entry) => entry.id !== item.id),
    ...plan.fixtures.map((fixture) => ({
      ...item,
      id: fixture.id,
      x: fixture.x,
      y: fixture.y,
      width: fixture.width,
      depth: fixture.depth,
      rotation: fixture.rotation,
    })),
  ]
  const snapped = snapFurniture(proposed, others, room, {
    enabled: !altHeld,
    grid: useEditorStore.getState().gridEnabled && !altHeld,
    threshold: snapThresholdInches(zoom, PIXELS_PER_INCH),
  })
  return { x: snapped.x, y: snapped.y, guides: snapped.guides }
}

function GridVisual({
  bounds,
  enabled,
  scale,
}: {
  bounds: { x: number; y: number; width: number; depth: number }
  enabled: boolean
  scale: number
}) {
  if (!enabled) return null
  const inv = 1 / scale
  const lines: number[][] = []
  const startX = Math.floor(bounds.x / GRID_INCHES) * GRID_INCHES
  const startY = Math.floor(bounds.y / GRID_INCHES) * GRID_INCHES
  for (let x = startX; x <= bounds.x + bounds.width; x += GRID_INCHES) {
    lines.push([x, bounds.y, x, bounds.y + bounds.depth])
  }
  for (let y = startY; y <= bounds.y + bounds.depth; y += GRID_INCHES) {
    lines.push([bounds.x, y, bounds.x + bounds.width, y])
  }
  return (
    <Group listening={false}>
      {lines.map((points, index) => (
        <Line key={index} points={points} stroke="rgba(44,42,38,0.035)" strokeWidth={inv} perfectDrawEnabled={false} />
      ))}
    </Group>
  )
}
