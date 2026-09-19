import { useEffect, useState } from 'react'
import { formatLength, parseLength } from '../utils/units'

type UnitInputProps = {
  valueInches: number
  onChange: (inches: number) => void
  onCommit?: () => void
  ariaLabel?: string
  className?: string
  min?: number
}

export function UnitInput({
  valueInches,
  onChange,
  onCommit,
  ariaLabel,
  className,
  min = 0.01,
}: UnitInputProps) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(formatLength(valueInches))

  useEffect(() => {
    if (!focused) setText(formatLength(valueInches))
  }, [valueInches, focused])

  const commit = () => {
    const parsed = parseLength(text)
    if (parsed === null || !Number.isFinite(parsed) || parsed < min) {
      setText(formatLength(valueInches))
      return
    }
    onCommit?.()
    onChange(parsed)
    setText(formatLength(parsed))
  }

  return (
    <input
      aria-label={ariaLabel}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        commit()
      }}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          setText(formatLength(valueInches))
          event.currentTarget.blur()
        }
      }}
      className={`h-8 w-full rounded-md border border-line bg-white/70 px-2 text-[13px] text-ink outline-none transition focus:border-ink/30 focus:bg-white ${className ?? ''}`}
    />
  )
}

export function NumberInput({
  value,
  onChange,
  onCommit,
  suffix,
  ariaLabel,
  step = 1,
}: {
  value: number
  onChange: (value: number) => void
  onCommit?: () => void
  suffix?: string
  ariaLabel?: string
  step?: number
}) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(String(Math.round(value)))

  useEffect(() => {
    if (!focused) setText(String(Math.round(value)))
  }, [value, focused])

  const commit = () => {
    const parsed = Number(text)
    if (!Number.isFinite(parsed)) {
      setText(String(Math.round(value)))
      return
    }
    onCommit?.()
    onChange(parsed)
  }

  return (
    <div className="relative">
      <input
        aria-label={ariaLabel}
        value={text}
        step={step}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          commit()
        }}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className="h-8 w-full rounded-md border border-line bg-white/70 px-2 pr-6 text-[13px] text-ink outline-none transition focus:border-ink/30 focus:bg-white"
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  )
}
