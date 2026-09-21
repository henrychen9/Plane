/** Inches per Three.js scene unit. 1 scene unit = 1 foot. */
const INCHES_PER_SCENE_UNIT = 12

export function inchesToSceneUnits(inches: number): number {
  return inches / INCHES_PER_SCENE_UNIT
}

export function sceneUnitsToInches(units: number): number {
  return units * INCHES_PER_SCENE_UNIT
}
