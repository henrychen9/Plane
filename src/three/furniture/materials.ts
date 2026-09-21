export type MaterialPreset = 'wood' | 'fabric' | 'metal' | 'glass' | 'ceramic' | 'plastic' | 'rug' | 'plantLeaf'

export const MATERIAL_PRESETS: Record<
  MaterialPreset,
  { roughness: number; metalness: number; opacity?: number }
> = {
  wood: { roughness: 0.55, metalness: 0.02 },
  fabric: { roughness: 0.92, metalness: 0 },
  metal: { roughness: 0.28, metalness: 0.58 },
  glass: { roughness: 0.1, metalness: 0.05, opacity: 0.34 },
  ceramic: { roughness: 0.48, metalness: 0.03 },
  plastic: { roughness: 0.4, metalness: 0.1 },
  rug: { roughness: 0.98, metalness: 0 },
  plantLeaf: { roughness: 0.72, metalness: 0 },
}

export function materialFromPreset(
  preset: MaterialPreset | undefined,
  overrides: { roughness?: number; metalness?: number; opacity?: number } = {},
) {
  const base = preset ? MATERIAL_PRESETS[preset] : { roughness: 0.88, metalness: 0.04 }
  const opacity = overrides.opacity ?? base.opacity ?? 1
  return {
    roughness: overrides.roughness ?? base.roughness,
    metalness: overrides.metalness ?? base.metalness,
    opacity,
    transparent: opacity < 1,
  }
}
