import type { EditorSelection, SelectionKind } from '../types/spatial'

export const MOUNTED_KINDS: SelectionKind[] = ['door', 'window', 'outlet', 'switch']
export const FREE_KINDS: SelectionKind[] = ['furniture', 'fixture']

export function sameSelection(a: EditorSelection, b: EditorSelection): boolean {
  return a.kind === b.kind && a.id === b.id
}

export function isSelected(selections: EditorSelection[], kind: SelectionKind, id: string): boolean {
  return selections.some((item) => item.kind === kind && item.id === id)
}

export function isMountedKind(kind: SelectionKind): boolean {
  return MOUNTED_KINDS.includes(kind)
}

export function isFreeKind(kind: SelectionKind): boolean {
  return FREE_KINDS.includes(kind)
}

export function canGroupTranslate(selections: EditorSelection[]): boolean {
  return selections.length > 0 && selections.every((item) => isFreeKind(item.kind))
}

export function hasMountedSelection(selections: EditorSelection[]): boolean {
  return selections.some((item) => isMountedKind(item.kind) || item.kind === 'wall')
}

export function uniqueSelections(items: EditorSelection[]): EditorSelection[] {
  const seen = new Set<string>()
  const next: EditorSelection[] = []
  for (const item of items) {
    const key = `${item.kind}:${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    next.push(item)
  }
  return next
}
