import { furnitureAABB } from '../../utils/geometry'
import { lShapeThickness } from '../../furniture/shapes'
import type { FurnitureItem, Point } from '../../types/spatial'
import { inchesToSceneUnits, sceneUnitsToInches } from '../utils/units'

const MIN_HEIGHT_INCHES = 0.25
const RUG_LIFT_INCHES = 0.12

export type Vec3 = [number, number, number]

export type FurnitureWorldTransform = {
  position: Vec3
  rotation: Vec3
}

export type LocalBox = {
  x: number
  y: number
  width: number
  depth: number
  height: number
  bottom?: number
}

export type BoxTransform = {
  position: Vec3
  size: Vec3
}

export function furnitureWorldTransform(item: FurnitureItem): FurnitureWorldTransform {
  return {
    position: [
      inchesToSceneUnits(item.x + item.width / 2),
      0,
      inchesToSceneUnits(item.y + item.depth / 2),
    ],
    rotation: [0, -((item.rotation || 0) * Math.PI) / 180, 0],
  }
}

export function topLeftInchesFromCenterScene(
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
) {
  return {
    x: sceneUnitsToInches(centerX) - width / 2,
    y: sceneUnitsToInches(centerZ) - depth / 2,
  }
}

export function localBoxTransform(
  item: Pick<FurnitureItem, 'width' | 'depth'>,
  box: LocalBox,
): BoxTransform {
  const height = Math.max(box.height, MIN_HEIGHT_INCHES)
  const bottom = box.bottom ?? 0
  return {
    position: [
      inchesToSceneUnits(box.x + box.width / 2 - item.width / 2),
      inchesToSceneUnits(bottom + height / 2),
      inchesToSceneUnits(box.y + box.depth / 2 - item.depth / 2),
    ],
    size: [inchesToSceneUnits(box.width), inchesToSceneUnits(height), inchesToSceneUnits(box.depth)],
  }
}

export function fullItemBox(item: FurnitureItem, bottom = 0): BoxTransform {
  return localBoxTransform(item, {
    x: 0,
    y: 0,
    width: item.width,
    depth: item.depth,
    height: item.height,
    bottom,
  })
}

export function lShapeBoxes(item: FurnitureItem): LocalBox[] {
  const thickness = lShapeThickness(item)
  const height = Math.max(item.height, MIN_HEIGHT_INCHES)
  const side = item.shapeData?.returnSide ?? 'left'
  const run: LocalBox = { x: 0, y: 0, width: item.width, depth: thickness, height }
  const ret: LocalBox =
    side === 'right'
      ? { x: item.width - thickness, y: 0, width: thickness, depth: item.depth, height }
      : { x: 0, y: 0, width: thickness, depth: item.depth, height }
  return [run, ret]
}

export function isThinFurniture(item: FurnitureItem): boolean {
  return item.height < 2
}

export function thinLiftInches(item: FurnitureItem): number {
  return isThinFurniture(item) ? RUG_LIFT_INCHES : 0
}

export function furnitureSnapshot(item: FurnitureItem): string {
  return [
    item.id,
    item.type,
    item.x,
    item.y,
    item.width,
    item.depth,
    item.height,
    item.rotation,
    item.color,
    item.shape ?? '',
    item.shapeData?.thickness ?? '',
    item.shapeData?.returnLength ?? '',
    item.shapeData?.returnSide ?? '',
  ].join(':')
}

export function maxFurnitureHeightScene(items: FurnitureItem[]): number {
  if (items.length === 0) return 0
  return inchesToSceneUnits(Math.max(...items.map((item) => Math.max(item.height, 0))))
}

export function furnitureFootprintPoints(items: FurnitureItem[]): Point[] {
  const points: Point[] = []
  for (const item of items) {
    const box = furnitureAABB(item)
    points.push({ x: box.x, y: box.y }, { x: box.x + box.width, y: box.y + box.depth })
  }
  return points
}
