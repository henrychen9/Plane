const FEET_INCHES =
  /^(\d+(?:\.\d+)?)\s*(?:'|ft|foot|feet)\s*(?:-|–)?\s*(\d+(?:\.\d+)?)?\s*(?:"|in|inch|inches)?\s*$/i
const INCHES_ONLY = /^(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)\s*$/i
const FEET_ONLY = /^(\d+(?:\.\d+)?)\s*(?:'|ft|foot|feet)\s*$/i
const BARE_NUMBER = /^(\d+(?:\.\d+)?)\s*$/
const COMPACT = /^(\d+(?:\.\d+)?)'\s*(\d+(?:\.\d+)?)?"?\s*$/

export function parseLength(input: string): number | null {
  const raw = input.trim().toLowerCase().replaceAll(',', '')
  if (!raw) return null

  const compact = raw.match(COMPACT)
  if (compact) {
    const feet = Number(compact[1])
    const inches = compact[2] ? Number(compact[2]) : 0
    if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null
    return feet * 12 + inches
  }

  const feetInches = raw.match(FEET_INCHES)
  if (feetInches) {
    const feet = Number(feetInches[1])
    const inches = feetInches[2] ? Number(feetInches[2]) : 0
    if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null
    return feet * 12 + inches
  }

  const inchesOnly = raw.match(INCHES_ONLY)
  if (inchesOnly) {
    const inches = Number(inchesOnly[1])
    return Number.isFinite(inches) ? inches : null
  }

  const feetOnly = raw.match(FEET_ONLY)
  if (feetOnly) {
    const feet = Number(feetOnly[1])
    return Number.isFinite(feet) ? feet * 12 : null
  }

  const bare = raw.match(BARE_NUMBER)
  if (bare) {
    const value = Number(bare[1])
    return Number.isFinite(value) ? value : null
  }

  return null
}

export function formatLength(inches: number): string {
  const rounded = Math.round(inches)
  const negative = rounded < 0
  const abs = Math.abs(rounded)
  const feet = Math.floor(abs / 12)
  const rest = abs % 12
  const sign = negative ? '−' : ''
  if (feet === 0) return `${sign}${rest}"`
  if (rest === 0) return `${sign}${feet}'`
  return `${sign}${feet}' ${rest}"`
}

export function formatFeetInchesPair(width: number, depth: number): string {
  return `${formatLength(width)} × ${formatLength(depth)}`
}

export function formatAreaSqFt(squareInches: number): string {
  const sqft = squareInches / 144
  if (sqft < 10) return `${sqft.toFixed(1)} sq ft`
  return `${Math.round(sqft)} sq ft`
}
