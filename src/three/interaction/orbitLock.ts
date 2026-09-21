import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

type OrbitSnapshot = {
  enabled: boolean
  enableDamping: boolean
  enablePan: boolean
  enableRotate: boolean
  enableZoom: boolean
}

let snapshot: OrbitSnapshot | null = null

export function lockOrbitControls(controls?: OrbitControlsImpl | null) {
  if (!controls) return
  if (!snapshot) {
    snapshot = {
      enabled: controls.enabled,
      enableDamping: controls.enableDamping,
      enablePan: controls.enablePan,
      enableRotate: controls.enableRotate,
      enableZoom: controls.enableZoom,
    }
  }
  controls.enabled = false
  controls.enableDamping = false
  controls.enablePan = false
  controls.enableRotate = false
  controls.enableZoom = false
}

export function unlockOrbitControls(controls?: OrbitControlsImpl | null, walking = false) {
  if (!controls) {
    snapshot = null
    return
  }
  const previous = snapshot
  snapshot = null
  if (walking) {
    controls.enabled = false
    controls.enableDamping = false
    controls.enablePan = false
    controls.enableRotate = false
    controls.enableZoom = false
    return
  }
  controls.enabled = previous?.enabled ?? true
  controls.enableDamping = previous?.enableDamping ?? true
  controls.enablePan = previous?.enablePan ?? true
  controls.enableRotate = previous?.enableRotate ?? true
  controls.enableZoom = previous?.enableZoom ?? true
}

export function blockNativeTransformEvent(event: { nativeEvent?: Event; stopPropagation: () => void }) {
  event.stopPropagation()
  const native = event.nativeEvent
  if (!native) return
  native.stopPropagation()
  native.stopImmediatePropagation?.()
}
