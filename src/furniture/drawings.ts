import { getCatalogItem } from '../catalog/furniture'
import { darken, lighten, mix, withAlpha } from '../utils/color'
import type { FurnitureItem, FurnitureRendererId, FurnitureShape } from '../types/spatial'
import { lShapePoints, lShapeThickness } from './shapes'

export type DrawPrimitive =
  | {
      kind: 'rect'
      x: number
      y: number
      width: number
      height: number
      fill?: string
      stroke?: string
      strokeWidth?: number
      cornerRadius?: number
      opacity?: number
    }
  | {
      kind: 'ellipse'
      cx: number
      cy: number
      rx: number
      ry: number
      fill?: string
      stroke?: string
      strokeWidth?: number
      opacity?: number
    }
  | {
      kind: 'line'
      points: number[]
      stroke: string
      strokeWidth: number
      opacity?: number
      lineCap?: 'butt' | 'round' | 'square'
    }
  | {
      kind: 'polygon'
      points: number[]
      fill?: string
      stroke?: string
      strokeWidth?: number
      opacity?: number
    }

type DrawFn = (width: number, depth: number, color: string) => DrawPrimitive[]

const renderers: Record<FurnitureRendererId, DrawFn> = {
  bed: drawBed,
  sofa: drawSofa,
  armchair: drawArmchair,
  'desk-chair': drawDeskChair,
  'dining-chair': drawDiningChair,
  table: drawTable,
  desk: drawDesk,
  dresser: drawDresser,
  bookshelf: drawBookshelf,
  nightstand: drawNightstand,
  rug: drawRug,
  lamp: drawLamp,
  plant: drawPlant,
  generic: drawGeneric,
}

export function furnitureDrawing(
  renderer: FurnitureRendererId,
  width: number,
  depth: number,
  color: string,
  shape: FurnitureShape = 'rectangle',
  shapeData?: FurnitureItem['shapeData'],
): DrawPrimitive[] {
  if (shape === 'circle' || shape === 'oval') {
    if (renderer === 'rug') return drawRoundRug(width, depth, color, shape === 'oval')
    if (renderer === 'desk') return drawRoundDesk(width, depth, color, shape === 'oval')
    return drawRoundTable(width, depth, color, shape === 'oval')
  }
  if (shape === 'lShape') {
    return drawLDesk(width, depth, color, shapeData)
  }
  return renderers[renderer](width, depth, color)
}

export function furnitureDrawingFor(item: Pick<FurnitureItem, 'type' | 'width' | 'depth' | 'color' | 'shape' | 'shapeData'>): DrawPrimitive[] {
  const catalog = getCatalogItem(item.type)
  return furnitureDrawing(
    catalog?.renderer ?? 'generic',
    item.width,
    item.depth,
    item.color,
    item.shape ?? catalog?.shape ?? 'rectangle',
    item.shapeData ?? catalog?.shapeData,
  )
}

function drawBed(w: number, d: number, color: string): DrawPrimitive[] {
  const frame = darken(color, 0.22)
  const mattress = lighten(color, 0.06)
  const linen = mix(color, '#f3eee7', 0.45)
  const duvet = mix(color, '#c4b6a4', 0.28)
  const pillow = lighten(color, 0.18)
  const stitch = withAlpha(darken(color, 0.28), 0.35)
  const inset = Math.max(1.6, Math.min(w, d) * 0.035)
  const head = Math.max(5, d * 0.08)
  const pillowH = Math.max(7, d * 0.12)
  const pillowW = (w - inset * 4.2) / 2 - 1.2
  const duvetY = inset + head + pillowH + 3

  return [
    { kind: 'rect', x: 0, y: 0, width: w, height: d, fill: frame, cornerRadius: 2.2 },
    {
      kind: 'rect',
      x: inset,
      y: inset,
      width: w - inset * 2,
      height: d - inset * 2,
      fill: mattress,
      cornerRadius: 1.6,
    },
    {
      kind: 'rect',
      x: inset,
      y: inset,
      width: w - inset * 2,
      height: head,
      fill: darken(color, 0.12),
      cornerRadius: 1.2,
    },
    {
      kind: 'rect',
      x: inset * 2,
      y: inset + head + 1.6,
      width: pillowW,
      height: pillowH,
      fill: pillow,
      cornerRadius: Math.min(3, pillowH / 3),
    },
    {
      kind: 'rect',
      x: w - inset * 2 - pillowW,
      y: inset + head + 1.6,
      width: pillowW,
      height: pillowH,
      fill: pillow,
      cornerRadius: Math.min(3, pillowH / 3),
    },
    {
      kind: 'rect',
      x: inset * 1.4,
      y: duvetY,
      width: w - inset * 2.8,
      height: d - duvetY - inset * 1.4,
      fill: duvet,
      cornerRadius: 1.8,
    },
    {
      kind: 'rect',
      x: inset * 1.4,
      y: duvetY,
      width: w - inset * 2.8,
      height: Math.max(4, d * 0.055),
      fill: linen,
      opacity: 0.9,
      cornerRadius: 1,
    },
    {
      kind: 'line',
      points: [inset * 2.2, duvetY + Math.max(5, d * 0.07), w - inset * 2.2, duvetY + Math.max(5, d * 0.07)],
      stroke: stitch,
      strokeWidth: 0.6,
    },
  ]
}

function drawSofa(w: number, d: number, color: string): DrawPrimitive[] {
  const body = color
  const back = darken(color, 0.14)
  const cushion = lighten(color, 0.1)
  const seam = withAlpha(darken(color, 0.3), 0.28)
  const armW = Math.max(5.5, w * 0.09)
  const backH = Math.max(6, d * 0.22)
  const seats = w >= 78 ? 3 : 2
  const seatY = backH + 1.4
  const seatH = d - seatY - 2
  const innerW = w - armW * 2 - 2
  const gap = 1.1
  const seatW = (innerW - gap * (seats - 1)) / seats

  const shapes: DrawPrimitive[] = [
    { kind: 'rect', x: 0, y: 0, width: w, height: d, fill: darken(color, 0.08), cornerRadius: 3.2 },
    { kind: 'rect', x: 1.2, y: 1.2, width: w - 2.4, height: backH, fill: back, cornerRadius: 2.4 },
    { kind: 'rect', x: 0, y: 1, width: armW, height: d - 2, fill: body, cornerRadius: 2.6 },
    { kind: 'rect', x: w - armW, y: 1, width: armW, height: d - 2, fill: body, cornerRadius: 2.6 },
  ]

  for (let i = 0; i < seats; i += 1) {
    const x = armW + 1 + i * (seatW + gap)
    shapes.push({
      kind: 'rect',
      x,
      y: seatY,
      width: seatW,
      height: seatH,
      fill: i % 2 === 0 ? cushion : mix(cushion, back, 0.12),
      cornerRadius: 2,
    })
    shapes.push({
      kind: 'line',
      points: [x + 2, seatY + seatH * 0.42, x + seatW - 2, seatY + seatH * 0.42],
      stroke: seam,
      strokeWidth: 0.7,
    })
  }

  return shapes
}

function drawArmchair(w: number, d: number, color: string): DrawPrimitive[] {
  const arm = Math.max(4.2, w * 0.16)
  const backH = d * 0.28
  return [
    { kind: 'rect', x: 0, y: 0, width: w, height: d, fill: darken(color, 0.08), cornerRadius: 3 },
    { kind: 'rect', x: 1, y: 1, width: w - 2, height: backH, fill: darken(color, 0.16), cornerRadius: 2.4 },
    { kind: 'rect', x: 0.4, y: 1.4, width: arm, height: d - 2.2, fill: color, cornerRadius: 2.2 },
    { kind: 'rect', x: w - arm - 0.4, y: 1.4, width: arm, height: d - 2.2, fill: color, cornerRadius: 2.2 },
    {
      kind: 'rect',
      x: arm + 1,
      y: backH + 1.6,
      width: w - arm * 2 - 2,
      height: d - backH - 3.2,
      fill: lighten(color, 0.12),
      cornerRadius: 2,
    },
  ]
}

function drawDeskChair(w: number, d: number, color: string): DrawPrimitive[] {
  const cx = w / 2
  const cy = d / 2
  const seatR = Math.min(w, d) * 0.28
  const base = darken(color, 0.08)
  const seat = lighten(color, 0.08)
  const backW = w * 0.62
  const backH = d * 0.22
  return [
    {
      kind: 'ellipse',
      cx,
      cy: cy + d * 0.04,
      rx: w * 0.42,
      ry: d * 0.42,
      fill: withAlpha(base, 0.18),
    },
    { kind: 'line', points: [cx, cy, cx - w * 0.32, cy + d * 0.28], stroke: base, strokeWidth: 1.4, lineCap: 'round' },
    { kind: 'line', points: [cx, cy, cx + w * 0.32, cy + d * 0.28], stroke: base, strokeWidth: 1.4, lineCap: 'round' },
    { kind: 'line', points: [cx, cy, cx, cy - d * 0.3], stroke: base, strokeWidth: 1.4, lineCap: 'round' },
    { kind: 'line', points: [cx, cy, cx - w * 0.34, cy - d * 0.08], stroke: base, strokeWidth: 1.4, lineCap: 'round' },
    { kind: 'line', points: [cx, cy, cx + w * 0.34, cy - d * 0.08], stroke: base, strokeWidth: 1.4, lineCap: 'round' },
    { kind: 'ellipse', cx, cy: cy + 1, rx: seatR, ry: seatR * 0.92, fill: seat },
    {
      kind: 'rect',
      x: (w - backW) / 2,
      y: 1.2,
      width: backW,
      height: backH,
      fill: color,
      cornerRadius: 2.4,
    },
  ]
}

function drawDiningChair(w: number, d: number, color: string): DrawPrimitive[] {
  const seat = lighten(color, 0.08)
  const wood = darken(color, 0.12)
  const pad = w * 0.14
  return [
    { kind: 'rect', x: pad * 0.4, y: d * 0.28, width: w - pad * 0.8, height: d * 0.62, fill: wood, cornerRadius: 1.6 },
    {
      kind: 'rect',
      x: pad,
      y: d * 0.34,
      width: w - pad * 2,
      height: d * 0.5,
      fill: seat,
      cornerRadius: 1.4,
    },
    { kind: 'rect', x: pad * 0.8, y: 1, width: w - pad * 1.6, height: d * 0.26, fill: wood, cornerRadius: 1.2 },
    {
      kind: 'line',
      points: [w * 0.38, 2.2, w * 0.38, d * 0.24],
      stroke: withAlpha(darken(color, 0.25), 0.45),
      strokeWidth: 0.8,
    },
    {
      kind: 'line',
      points: [w * 0.62, 2.2, w * 0.62, d * 0.24],
      stroke: withAlpha(darken(color, 0.25), 0.45),
      strokeWidth: 0.8,
    },
  ]
}

function drawTable(w: number, d: number, color: string): DrawPrimitive[] {
  const top = lighten(color, 0.04)
  const edge = darken(color, 0.16)
  const leg = darken(color, 0.22)
  const inset = Math.max(2.2, Math.min(w, d) * 0.08)
  const legS = Math.max(2.4, Math.min(w, d) * 0.07)
  return [
    { kind: 'rect', x: 0, y: 0, width: w, height: d, fill: edge, cornerRadius: 2.2 },
    {
      kind: 'rect',
      x: 1.1,
      y: 1.1,
      width: w - 2.2,
      height: d - 2.2,
      fill: top,
      cornerRadius: 1.6,
    },
    { kind: 'rect', x: inset, y: inset, width: legS, height: legS, fill: leg, cornerRadius: 0.6 },
    { kind: 'rect', x: w - inset - legS, y: inset, width: legS, height: legS, fill: leg, cornerRadius: 0.6 },
    { kind: 'rect', x: inset, y: d - inset - legS, width: legS, height: legS, fill: leg, cornerRadius: 0.6 },
    {
      kind: 'rect',
      x: w - inset - legS,
      y: d - inset - legS,
      width: legS,
      height: legS,
      fill: leg,
      cornerRadius: 0.6,
    },
  ]
}

function drawDesk(w: number, d: number, color: string): DrawPrimitive[] {
  const top = lighten(color, 0.06)
  const wood = darken(color, 0.14)
  const drawer = mix(color, '#d8c8b4', 0.2)
  const legS = Math.max(2.2, Math.min(w, d) * 0.065)
  const inset = Math.max(2, Math.min(w, d) * 0.07)
  return [
    { kind: 'rect', x: 0, y: 0, width: w, height: d, fill: wood, cornerRadius: 1.8 },
    { kind: 'rect', x: 1, y: 1, width: w - 2, height: d - 2, fill: top, cornerRadius: 1.3 },
    {
      kind: 'rect',
      x: w * 0.62,
      y: d * 0.18,
      width: w * 0.3,
      height: d * 0.64,
      fill: drawer,
      cornerRadius: 0.8,
    },
    {
      kind: 'line',
      points: [w * 0.64, d * 0.5, w * 0.9, d * 0.5],
      stroke: withAlpha(wood, 0.45),
      strokeWidth: 0.7,
    },
    { kind: 'rect', x: inset, y: inset, width: legS, height: legS, fill: wood, cornerRadius: 0.5 },
    { kind: 'rect', x: w - inset - legS, y: inset, width: legS, height: legS, fill: wood, cornerRadius: 0.5 },
    { kind: 'rect', x: inset, y: d - inset - legS, width: legS, height: legS, fill: wood, cornerRadius: 0.5 },
    {
      kind: 'rect',
      x: w - inset - legS,
      y: d - inset - legS,
      width: legS,
      height: legS,
      fill: wood,
      cornerRadius: 0.5,
    },
  ]
}

function drawDresser(w: number, d: number, color: string): DrawPrimitive[] {
  const drawer = lighten(color, 0.1)
  const line = withAlpha(darken(color, 0.28), 0.4)
  const knobs = darken(color, 0.25)
  const rows = 3
  const pad = 1.6
  const rowH = (d - pad * 2 - 1.2 * (rows - 1)) / rows
  const shapes: DrawPrimitive[] = [
    { kind: 'rect', x: 0, y: 0, width: w, height: d, fill: darken(color, 0.1), cornerRadius: 1.6 },
  ]
  for (let i = 0; i < rows; i += 1) {
    const y = pad + i * (rowH + 1.2)
    shapes.push({
      kind: 'rect',
      x: pad,
      y,
      width: w - pad * 2,
      height: rowH,
      fill: drawer,
      cornerRadius: 0.8,
    })
    shapes.push({
      kind: 'ellipse',
      cx: w / 2,
      cy: y + rowH / 2,
      rx: Math.min(1.4, w * 0.02),
      ry: Math.min(1.4, w * 0.02),
      fill: knobs,
    })
    if (i < rows - 1) {
      shapes.push({
        kind: 'line',
        points: [pad + 2, y + rowH + 0.6, w - pad - 2, y + rowH + 0.6],
        stroke: line,
        strokeWidth: 0.5,
      })
    }
  }
  return shapes
}

function drawBookshelf(w: number, d: number, color: string): DrawPrimitive[] {
  const wood = color
  const inner = lighten(color, 0.12)
  const shelves = 4
  const pad = 1.4
  const shapes: DrawPrimitive[] = [
    { kind: 'rect', x: 0, y: 0, width: w, height: d, fill: darken(color, 0.12), cornerRadius: 1.2 },
    { kind: 'rect', x: pad, y: pad, width: w - pad * 2, height: d - pad * 2, fill: inner, cornerRadius: 0.6 },
  ]
  const innerH = d - pad * 2
  const shelfH = innerH / shelves
  const bookColors = ['#6B4F3A', '#8A6A4B', '#4F5B4A', '#7A5E52', '#C4A574', '#5A4E46', '#9A7B63']
  const bookWidths = [3.1, 2.3, 3.8, 2.7, 2.1, 3.4, 2.5]
  for (let s = 0; s < shelves; s += 1) {
    const y = pad + (s + 1) * shelfH
    if (s < shelves - 1) {
      shapes.push({
        kind: 'line',
        points: [pad, y, w - pad, y],
        stroke: wood,
        strokeWidth: 1.1,
      })
    }
    let x = pad + 1.2
    let i = 0
    const maxX = w - pad - 1.2
    const bh = shelfH - 2.2
    while (x < maxX - 2) {
      const bw = Math.min(bookWidths[(i + s) % bookWidths.length], maxX - x)
      if (bw < 1.6) break
      shapes.push({
        kind: 'rect',
        x,
        y: y - bh - 0.4,
        width: bw,
        height: bh,
        fill: bookColors[(i + s * 2) % bookColors.length],
        cornerRadius: 0.3,
        opacity: 0.88,
      })
      x += bw + 0.45
      i += 1
    }
  }
  return shapes
}

function drawNightstand(w: number, d: number, color: string): DrawPrimitive[] {
  return [
    { kind: 'rect', x: 0, y: 0, width: w, height: d, fill: darken(color, 0.1), cornerRadius: 1.4 },
    {
      kind: 'rect',
      x: 1.4,
      y: 1.4,
      width: w - 2.8,
      height: d * 0.42,
      fill: lighten(color, 0.1),
      cornerRadius: 0.8,
    },
    {
      kind: 'rect',
      x: 1.4,
      y: d * 0.52,
      width: w - 2.8,
      height: d * 0.38,
      fill: lighten(color, 0.06),
      cornerRadius: 0.8,
    },
    { kind: 'ellipse', cx: w / 2, cy: d * 0.32, rx: 1.1, ry: 1.1, fill: darken(color, 0.25) },
    { kind: 'ellipse', cx: w / 2, cy: d * 0.71, rx: 1.1, ry: 1.1, fill: darken(color, 0.25) },
  ]
}

function drawRug(w: number, d: number, color: string): DrawPrimitive[] {
  const field = mix(color, '#efe8dc', 0.15)
  const border = darken(color, 0.12)
  const fringe = withAlpha(mix(color, '#d9cbb8', 0.4), 0.7)
  const inset = Math.max(3, Math.min(w, d) * 0.045)
  const shapes: DrawPrimitive[] = [
    { kind: 'rect', x: 0, y: 0, width: w, height: d, fill: field, cornerRadius: 2, opacity: 0.92 },
    {
      kind: 'rect',
      x: inset,
      y: inset,
      width: w - inset * 2,
      height: d - inset * 2,
      stroke: withAlpha(border, 0.55),
      strokeWidth: 1.1,
      cornerRadius: 1.2,
    },
    {
      kind: 'rect',
      x: inset * 1.8,
      y: inset * 1.8,
      width: w - inset * 3.6,
      height: d - inset * 3.6,
      fill: withAlpha(lighten(color, 0.08), 0.25),
      cornerRadius: 1,
    },
  ]
  const fringeCount = Math.max(8, Math.floor(w / 6))
  for (let i = 0; i < fringeCount; i += 1) {
    const x = (w / (fringeCount + 1)) * (i + 1)
    shapes.push({
      kind: 'line',
      points: [x, 0.4, x, 2.6],
      stroke: fringe,
      strokeWidth: 0.7,
      lineCap: 'round',
    })
    shapes.push({
      kind: 'line',
      points: [x, d - 0.4, x, d - 2.6],
      stroke: fringe,
      strokeWidth: 0.7,
      lineCap: 'round',
    })
  }
  return shapes
}

function drawLamp(w: number, d: number, color: string): DrawPrimitive[] {
  const cx = w / 2
  const cy = d / 2
  const shade = lighten(color, 0.08)
  const base = darken(color, 0.2)
  const r = Math.min(w, d) / 2
  return [
    { kind: 'ellipse', cx, cy, rx: r * 0.92, ry: r * 0.92, fill: withAlpha(shade, 0.35) },
    { kind: 'ellipse', cx, cy, rx: r * 0.58, ry: r * 0.58, fill: shade },
    { kind: 'ellipse', cx, cy, rx: r * 0.22, ry: r * 0.22, fill: base },
    { kind: 'ellipse', cx, cy, rx: r * 0.08, ry: r * 0.08, fill: lighten(base, 0.2) },
  ]
}

function drawPlant(w: number, d: number, color: string): DrawPrimitive[] {
  const cx = w / 2
  const cy = d / 2
  const leaf = color
  const leaf2 = lighten(color, 0.16)
  const leaf3 = darken(color, 0.18)
  const pot = '#C4B09A'
  const r = Math.min(w, d) / 2
  return [
    { kind: 'ellipse', cx, cy: cy + r * 0.18, rx: r * 0.72, ry: r * 0.62, fill: leaf3, opacity: 0.9 },
    { kind: 'ellipse', cx: cx - r * 0.22, cy: cy - r * 0.08, rx: r * 0.42, ry: r * 0.38, fill: leaf },
    { kind: 'ellipse', cx: cx + r * 0.24, cy: cy - r * 0.12, rx: r * 0.4, ry: r * 0.36, fill: leaf2 },
    { kind: 'ellipse', cx, cy: cy - r * 0.28, rx: r * 0.34, ry: r * 0.32, fill: mix(leaf, leaf2, 0.4) },
    { kind: 'ellipse', cx: cx + r * 0.08, cy: cy + r * 0.06, rx: r * 0.3, ry: r * 0.28, fill: lighten(leaf, 0.08) },
    { kind: 'ellipse', cx, cy: cy + r * 0.42, rx: r * 0.28, ry: r * 0.2, fill: darken(pot, 0.1) },
    { kind: 'ellipse', cx, cy: cy + r * 0.34, rx: r * 0.3, ry: r * 0.16, fill: pot },
  ]
}

function drawGeneric(w: number, d: number, color: string): DrawPrimitive[] {
  return [
    { kind: 'rect', x: 0, y: 0, width: w, height: d, fill: darken(color, 0.08), cornerRadius: 2 },
    {
      kind: 'rect',
      x: 2,
      y: 2,
      width: w - 4,
      height: d - 4,
      fill: lighten(color, 0.08),
      cornerRadius: 1.4,
    },
  ]
}

function drawRoundTable(w: number, d: number, color: string, oval: boolean): DrawPrimitive[] {
  const cx = w / 2
  const cy = d / 2
  const rx = w / 2
  const ry = oval ? d / 2 : w / 2
  const top = lighten(color, 0.05)
  const edge = darken(color, 0.18)
  const grain = withAlpha(darken(color, 0.12), 0.28)
  return [
    { kind: 'ellipse', cx, cy, rx, ry, fill: edge },
    { kind: 'ellipse', cx, cy, rx: rx - 1.3, ry: ry - 1.3, fill: top },
    { kind: 'ellipse', cx, cy, rx: rx * 0.18, ry: ry * 0.18, fill: withAlpha(edge, 0.35) },
    { kind: 'ellipse', cx, cy, rx: rx * 0.72, ry: ry * 0.72, stroke: grain, strokeWidth: 0.7 },
  ]
}

function drawRoundDesk(w: number, d: number, color: string, oval: boolean): DrawPrimitive[] {
  const cx = w / 2
  const cy = d / 2
  const rx = w / 2
  const ry = oval ? d / 2 : w / 2
  const top = lighten(color, 0.06)
  const wood = darken(color, 0.14)
  return [
    { kind: 'ellipse', cx, cy, rx, ry, fill: wood },
    { kind: 'ellipse', cx, cy, rx: rx - 1.2, ry: ry - 1.2, fill: top },
    {
      kind: 'ellipse',
      cx: cx + rx * 0.22,
      cy,
      rx: rx * 0.28,
      ry: ry * 0.34,
      fill: mix(color, '#d8c8b4', 0.18),
    },
    { kind: 'ellipse', cx, cy, rx: rx * 0.12, ry: ry * 0.12, fill: withAlpha(wood, 0.4) },
  ]
}

function drawRoundRug(w: number, d: number, color: string, oval: boolean): DrawPrimitive[] {
  const cx = w / 2
  const cy = d / 2
  const rx = w / 2
  const ry = oval ? d / 2 : w / 2
  const field = mix(color, '#efe8dc', 0.15)
  const border = darken(color, 0.12)
  return [
    { kind: 'ellipse', cx, cy, rx, ry, fill: field, opacity: 0.92 },
    { kind: 'ellipse', cx, cy, rx: rx * 0.88, ry: ry * 0.88, stroke: withAlpha(border, 0.55), strokeWidth: 1.1 },
    { kind: 'ellipse', cx, cy, rx: rx * 0.72, ry: ry * 0.72, fill: withAlpha(lighten(color, 0.08), 0.25) },
  ]
}

function drawLDesk(w: number, d: number, color: string, shapeData?: FurnitureItem['shapeData']): DrawPrimitive[] {
  const item = { width: w, depth: d, shapeData }
  const points = lShapePoints(item)
  const t = lShapeThickness(item)
  const top = lighten(color, 0.06)
  const wood = darken(color, 0.14)
  const drawer = mix(color, '#d8c8b4', 0.2)
  const side = shapeData?.returnSide ?? 'left'
  const drawerX = side === 'right' ? w * 0.08 : t + w * 0.08
  return [
    { kind: 'polygon', points, fill: wood },
    { kind: 'polygon', points: insetPolygon(points, 1), fill: top },
    {
      kind: 'rect',
      x: drawerX,
      y: t * 0.18,
      width: Math.max(10, w * 0.28),
      height: t * 0.64,
      fill: drawer,
      cornerRadius: 0.8,
    },
  ]
}

function insetPolygon(points: number[], inset: number): number[] {
  const xs = points.filter((_, i) => i % 2 === 0)
  const ys = points.filter((_, i) => i % 2 === 1)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return points.map((value, index) => {
    if (index % 2 === 0) {
      if (value <= minX + 0.01) return value + inset
      if (value >= maxX - 0.01) return value - inset
      return value
    }
    if (value <= minY + 0.01) return value + inset
    if (value >= maxY - 0.01) return value - inset
    return value
  })
}
