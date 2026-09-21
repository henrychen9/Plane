import { FrontSide } from 'three'
import { RoundedBox } from '@react-three/drei'
import type { Vec3 } from './furnitureGeometry'
import { materialFromPreset, type MaterialPreset } from './materials'

const skipRaycast = () => {}

type SurfaceProps = {
  color: string
  preset?: MaterialPreset
  roughness?: number
  metalness?: number
  opacity?: number
  castShadow?: boolean
  receiveShadow?: boolean
}

function SurfaceMaterial({ color, preset, roughness, metalness, opacity }: SurfaceProps) {
  const mat = materialFromPreset(preset, { roughness, metalness, opacity })
  return (
    <meshStandardMaterial
      color={color}
      roughness={mat.roughness}
      metalness={mat.metalness}
      opacity={mat.opacity}
      transparent={mat.transparent}
      side={FrontSide}
    />
  )
}

export function FurnitureBox({
  position,
  size,
  color,
  preset,
  roughness,
  metalness,
  opacity,
  castShadow = true,
  receiveShadow = true,
}: SurfaceProps & {
  position: Vec3
  size: Vec3
}) {
  if (size[0] <= 0 || size[1] <= 0 || size[2] <= 0) return null
  return (
    <mesh
      position={position}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      raycast={skipRaycast}
    >
      <boxGeometry args={size} />
      <SurfaceMaterial color={color} preset={preset} roughness={roughness} metalness={metalness} opacity={opacity} />
    </mesh>
  )
}

export function FurnitureCylinder({
  position,
  radius,
  height,
  color,
  preset,
  radialSegments = 28,
  scale,
  roughness,
  metalness,
  opacity,
  castShadow = true,
  receiveShadow = true,
}: SurfaceProps & {
  position: Vec3
  radius: number
  height: number
  radialSegments?: number
  scale?: Vec3
}) {
  if (radius <= 0 || height <= 0) return null
  return (
    <mesh
      position={position}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      raycast={skipRaycast}
    >
      <cylinderGeometry args={[radius, radius, height, radialSegments]} />
      <SurfaceMaterial color={color} preset={preset} roughness={roughness} metalness={metalness} opacity={opacity} />
    </mesh>
  )
}

export function FurnitureSphere({
  position,
  radius,
  color,
  preset,
  roughness,
  metalness,
  opacity,
  scale,
  castShadow = true,
  receiveShadow = true,
}: SurfaceProps & {
  position: Vec3
  radius: number
  scale?: Vec3
}) {
  if (radius <= 0) return null
  return (
    <mesh
      position={position}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      raycast={skipRaycast}
    >
      <sphereGeometry args={[radius, 18, 14]} />
      <SurfaceMaterial color={color} preset={preset} roughness={roughness} metalness={metalness} opacity={opacity} />
    </mesh>
  )
}

export function FurnitureRoundedBox({
  position,
  size,
  color,
  preset,
  roughness,
  metalness,
  opacity,
  radius,
  smoothness = 2,
  castShadow = true,
  receiveShadow = true,
}: SurfaceProps & {
  position: Vec3
  size: Vec3
  radius?: number
  smoothness?: number
}) {
  if (size[0] <= 0 || size[1] <= 0 || size[2] <= 0) return null
  const maxRadius = Math.min(size[0], size[1], size[2]) * 0.45
  const nextRadius = Math.min(radius ?? Math.min(size[0], size[1], size[2]) * 0.1, maxRadius)
  if (nextRadius < 0.006) {
    return (
      <FurnitureBox
        position={position}
        size={size}
        color={color}
        preset={preset}
        roughness={roughness}
        metalness={metalness}
        opacity={opacity}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      />
    )
  }
  return (
    <RoundedBox
      args={size}
      radius={nextRadius}
      smoothness={smoothness}
      bevelSegments={2}
      position={position}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      raycast={skipRaycast}
    >
      <SurfaceMaterial color={color} preset={preset} roughness={roughness} metalness={metalness} opacity={opacity} />
    </RoundedBox>
  )
}

export function FurnitureCone({
  position,
  radius,
  height,
  color,
  preset,
  roughness,
  metalness,
  opacity,
  rotation,
  castShadow = true,
  receiveShadow = true,
}: SurfaceProps & {
  position: Vec3
  radius: number
  height: number
  rotation?: Vec3
}) {
  if (radius <= 0 || height <= 0) return null
  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      raycast={skipRaycast}
    >
      <coneGeometry args={[radius, height, 20]} />
      <SurfaceMaterial color={color} preset={preset} roughness={roughness} metalness={metalness} opacity={opacity} />
    </mesh>
  )
}
