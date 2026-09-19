import { useEffect, useRef, useState } from 'react'
import { parseLength } from '../../utils/units'

export function NewSpaceModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, width: number, depth: number) => void
}) {
  const [name, setName] = useState('')
  const [width, setWidth] = useState('16\'')
  const [depth, setDepth] = useState('20\'')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setWidth('16\'')
    setDepth('20\'')
    setError('')
    const id = window.setTimeout(() => inputRef.current?.focus(), 40)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const submit = () => {
    const parsedWidth = parseLength(width)
    const parsedDepth = parseLength(depth)
    if (!name.trim()) {
      setError('Please name this space.')
      return
    }
    if (parsedWidth === null || parsedWidth < 36 || parsedDepth === null || parsedDepth < 36) {
      setError('Enter a width and depth of at least 3 feet.')
      return
    }
    onCreate(name.trim(), parsedWidth, parsedDepth)
  }

  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-[#2c2a26]/18 p-6" onClick={onClose}>
      <div
        className="anim-rise w-full max-w-[420px] rounded-2xl border border-line bg-[#fffdf9] p-6 shadow-[0_24px_60px_rgba(44,42,38,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-serif text-[28px] leading-none text-ink">New space</p>
        <p className="mt-2 text-[13px] text-ink-soft">Give it a name and the room’s footprint.</p>

        <label className="mt-6 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Name
        </label>
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Chicago Studio"
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit()
          }}
          className="mt-2 h-10 w-full rounded-lg border border-line bg-white px-3 text-[14px] outline-none transition focus:border-ink/30"
        />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              Width
            </label>
            <input
              value={width}
              onChange={(event) => setWidth(event.target.value)}
              placeholder="18 ft 4 in"
              className="mt-2 h-10 w-full rounded-lg border border-line bg-white px-3 text-[14px] outline-none transition focus:border-ink/30"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              Depth
            </label>
            <input
              value={depth}
              onChange={(event) => setDepth(event.target.value)}
              placeholder="23 ft 8 in"
              className="mt-2 h-10 w-full rounded-lg border border-line bg-white px-3 text-[14px] outline-none transition focus:border-ink/30"
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-[12px] text-red-800">{error}</p> : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-3 text-[13px] text-ink-soft hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-9 rounded-lg bg-ink px-4 text-[13px] text-[#f7f4ef] transition hover:bg-ink/90"
          >
            Create Space
          </button>
        </div>
      </div>
    </div>
  )
}
