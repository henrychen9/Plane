import { useThree, type ThreeEvent } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { FurnitureItem } from '../../types/spatial'
import { useEditorStore } from '../../state/editorStore'
import { inchesToSceneUnits } from '../utils/units'
import { furnitureWorldTransform } from '../furniture/furnitureGeometry'
import { useActiveFurniture } from '../furniture/Furniture3D'
import {
  TRANSFORM_CORNERS,
  type CornerId,
  cornerLocalOffset,
} from './furnitureTransform'
import { capturePointer } from './pointerSession'
import { beginResizePointer, beginRotatePointer, furnitureTransform } from './transformSession'
import { TRANSFORM_HANDLE_KEY } from './handleRaycast'
import { blockNativeTransformEvent, lockOrbitControls, unlockOrbitControls } from './orbitLock'

const RING_PAD_INCHES = 10
const HANDLE_PAD_INCHES = 3.2
const HANDLE_SIZE = inchesToSceneUnits(3.4)
const RING_LIFT = inchesToSceneUnits(1.6)
const HANDLE_LIFT = inchesToSceneUnits(2.2)
const RING_PICK_TUBE = inchesToSceneUnits(5.5)
const RING_VISUAL_TUBE = inchesToSceneUnits(0.22)
const KNOB_RADIUS = inchesToSceneUnits(2.15)
const KNOB_PICK = inchesToSceneUnits(4.2)
const INK = '#2c2a26'
const FILL = '#fffdf9'
const handleData = { [TRANSFORM_HANDLE_KEY]: true }

function skipRaycast() {}

function RotateRing({ item }: { item: FurnitureItem }) {
  const get = useThree((state) => state.get)
  const radius = inchesToSceneUnits(Math.hypot(item.width / 2, item.depth / 2) + RING_PAD_INCHES)
  const yaw = -((item.rotation || 0) * Math.PI) / 180
  const knobX = Math.cos(yaw) * radius
  const knobZ = -Math.sin(yaw) * radius

  const onDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return
    const editor = useEditorStore.getState()
    if (editor.cameraMode === 'walk' || item.locked) return
    if (furnitureTransform.grabbing) return
    blockNativeTransformEvent(event)
    const three = get()
    const controls = three.controls as OrbitControlsImpl | undefined
    lockOrbitControls(controls)
    editor.setDraggingId(item.id)
    const started = beginRotatePointer(
      item,
      event.nativeEvent.clientX,
      event.nativeEvent.clientY,
      three.gl.domElement,
      three.camera,
    )
    if (!started) {
      editor.setDraggingId(null)
      unlockOrbitControls(controls, false)
      return
    }
    capturePointer(three.gl.domElement, event.nativeEvent.pointerId)
    three.gl.domElement.style.cursor = 'grabbing'
  }

  return (
    <group userData={handleData}>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, RING_LIFT, 0]}
        userData={handleData}
        onPointerDown={onDown}
        renderOrder={40}
      >
        <torusGeometry args={[radius, RING_PICK_TUBE, 8, 72]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, RING_LIFT, 0]} raycast={skipRaycast} renderOrder={41}>
        <torusGeometry args={[radius, RING_VISUAL_TUBE, 6, 80]} />
        <meshBasicMaterial color={INK} transparent opacity={0.5} depthTest={false} />
      </mesh>
      <mesh
        position={[knobX, RING_LIFT, knobZ]}
        userData={handleData}
        onPointerDown={onDown}
        renderOrder={42}
      >
        <sphereGeometry args={[KNOB_PICK, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh position={[knobX, RING_LIFT, knobZ]} raycast={skipRaycast} renderOrder={43}>
        <sphereGeometry args={[KNOB_RADIUS, 16, 12]} />
        <meshBasicMaterial color={FILL} depthTest={false} />
      </mesh>
      <mesh position={[knobX, RING_LIFT, knobZ]} raycast={skipRaycast} renderOrder={44}>
        <sphereGeometry args={[KNOB_RADIUS * 1.06, 16, 12]} />
        <meshBasicMaterial color={INK} wireframe transparent opacity={0.35} depthTest={false} />
      </mesh>
    </group>
  )
}

function ResizeHandle({ item, corner }: { item: FurnitureItem; corner: CornerId }) {
  const get = useThree((state) => state.get)
  const offset = cornerLocalOffset(corner, item.width, item.depth, HANDLE_PAD_INCHES)

  const onDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return
    const editor = useEditorStore.getState()
    if (editor.cameraMode === 'walk' || item.locked) return
    if (furnitureTransform.grabbing) return
    blockNativeTransformEvent(event)
    const three = get()
    const controls = three.controls as OrbitControlsImpl | undefined
    lockOrbitControls(controls)
    editor.setDraggingId(item.id)
    beginResizePointer(item, corner, event.nativeEvent.clientX, event.nativeEvent.clientY)
    capturePointer(three.gl.domElement, event.nativeEvent.pointerId)
    three.gl.domElement.style.cursor = 'grabbing'
  }

  return (
    <group
      userData={handleData}
      position={[inchesToSceneUnits(offset.x), HANDLE_LIFT, inchesToSceneUnits(offset.z)]}
      onPointerDown={onDown}
    >
      <mesh userData={handleData} renderOrder={40}>
        <boxGeometry args={[HANDLE_SIZE * 2.1, HANDLE_SIZE, HANDLE_SIZE * 2.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh raycast={skipRaycast} renderOrder={41}>
        <boxGeometry args={[HANDLE_SIZE, HANDLE_SIZE * 0.42, HANDLE_SIZE]} />
        <meshBasicMaterial color={FILL} depthTest={false} />
      </mesh>
      <mesh raycast={skipRaycast} renderOrder={42}>
        <boxGeometry args={[HANDLE_SIZE * 1.04, HANDLE_SIZE * 0.46, HANDLE_SIZE * 1.04]} />
        <meshBasicMaterial color={INK} wireframe transparent opacity={0.4} depthTest={false} />
      </mesh>
    </group>
  )
}

export function FurnitureTransformControls() {
  const cameraMode = useEditorStore((state) => state.cameraMode)
  const selections = useEditorStore((state) => state.selections)
  const furniture = useActiveFurniture()

  if (cameraMode === 'walk') return null
  if (selections.length !== 1 || selections[0].kind !== 'furniture') return null
  const item = furniture.find((entry) => entry.id === selections[0].id)
  if (!item || item.locked) return null

  const world = furnitureWorldTransform(item)

  return (
    <group>
      <group position={world.position}>
        <RotateRing item={item} />
      </group>
      <group position={world.position} rotation={world.rotation}>
        {TRANSFORM_CORNERS.map((corner) => (
          <ResizeHandle key={corner} item={item} corner={corner} />
        ))}
      </group>
    </group>
  )
}
