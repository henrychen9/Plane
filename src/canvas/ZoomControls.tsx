export function ZoomControls({
  zoom,
  onZoomBy,
  onFit,
  gridEnabled,
  onToggleGrid,
}: {
  zoom: number
  onZoomBy: (factor: number) => void
  onFit: () => void
  gridEnabled: boolean
  onToggleGrid: () => void
}) {
  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 min-[1100px]:left-auto min-[1100px]:right-[292px] min-[1100px]:translate-x-0" data-within-panel="true">
      <div className="panel flex items-center rounded-xl p-1">
        <ControlButton label="Zoom out" onClick={() => onZoomBy(1 / 1.18)}>
          −
        </ControlButton>
        <span className="min-w-[48px] text-center text-[12px] tabular-nums text-ink-soft">
          {Math.round(zoom * 100)}%
        </span>
        <ControlButton label="Zoom in" onClick={() => onZoomBy(1.18)}>
          +
        </ControlButton>
        <span className="mx-1 h-4 w-px bg-line" />
        <ControlButton label="Fit to room" onClick={onFit}>
          Fit
        </ControlButton>
      </div>
      <button
        type="button"
        onClick={onToggleGrid}
        className="panel flex h-10 items-center gap-2 rounded-xl px-3 text-[12px] text-ink-soft"
      >
        Grid
        <span className="text-ink">{gridEnabled ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="h-8 min-w-8 rounded-lg px-2 text-[13px] text-ink-soft transition hover:bg-paper-deep hover:text-ink"
    >
      {children}
    </button>
  )
}
