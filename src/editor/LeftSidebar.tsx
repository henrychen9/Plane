import { useState } from 'react'
import { CATEGORY_LABELS, catalogByCategory } from '../catalog/furniture'
import { formatLength } from '../utils/units'
import { FurnitureSvg } from '../furniture/FurnitureVisual'
import { useEditorStore } from '../state/editorStore'
import type { BuildTool, CatalogItem } from '../types/spatial'

const BUILD_TOOLS: { id: BuildTool; label: string; shortcut?: string }[] = [
  { id: 'select', label: 'Select', shortcut: 'V' },
  { id: 'wall', label: 'Wall', shortcut: 'W' },
  { id: 'door', label: 'Door', shortcut: 'D' },
  { id: 'window', label: 'Window', shortcut: 'N' },
  { id: 'outlet', label: 'Outlet' },
  { id: 'switch', label: 'Switch' },
  { id: 'column', label: 'Column' },
  { id: 'measure', label: 'Measure', shortcut: 'M' },
]

const STRUCTURE: { id: BuildTool; label: string }[] = [
  { id: 'radiator', label: 'Radiator' },
  { id: 'vent', label: 'HVAC vent' },
  { id: 'cabinet', label: 'Built-in' },
  { id: 'counter', label: 'Counter' },
]

export function LeftSidebar() {
  const tab = useEditorStore((state) => state.libraryTab)
  const setTab = useEditorStore((state) => state.setLibraryTab)
  const tool = useEditorStore((state) => state.tool)
  const setTool = useEditorStore((state) => state.setTool)
  const openCategories = useEditorStore((state) => state.openCategories)
  const toggleCategory = useEditorStore((state) => state.toggleCategory)
  const setLibraryDrag = useEditorStore((state) => state.setLibraryDrag)
  const groups = catalogByCategory()

  return (
    <aside className="panel pointer-events-auto absolute bottom-3 left-3 top-[72px] z-20 flex w-[248px] max-w-[38vw] flex-col overflow-hidden rounded-xl">
      <div className="grid grid-cols-2 gap-1 p-2">
        <TabButton active={tab === 'build'} onClick={() => setTab('build')}>
          Build
        </TabButton>
        <TabButton active={tab === 'furniture'} onClick={() => setTab('furniture')}>
          Furniture
        </TabButton>
      </div>
      <div className="h-px bg-line" />
      <div className="scroll-thin flex-1 overflow-auto p-2">
        {tab === 'build' ? (
          <div className="space-y-1">
            {BUILD_TOOLS.map((item) => (
              <ToolButton
                key={item.id}
                active={tool === item.id}
                label={item.label}
                shortcut={item.shortcut}
                icon={item.id}
                onClick={() => setTool(item.id)}
              />
            ))}
            <p className="px-2 pb-1 pt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              Fixed
            </p>
            {STRUCTURE.map((item) => (
              <ToolButton
                key={item.id}
                active={tool === item.id}
                label={item.label}
                icon={item.id}
                onClick={() => setTool(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map((group) => {
              const open = openCategories.includes(group.category)
              return (
                <div key={group.category}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(group.category)}
                    className="flex h-8 w-full items-center justify-between rounded-md px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted hover:text-ink"
                  >
                    {CATEGORY_LABELS[group.category]}
                    <span className="text-[10px]">{open ? '–' : '+'}</span>
                  </button>
                  {open ? (
                    <div className="anim-fade space-y-1 pb-2">
                      {group.items.map((item) => (
                        <LibraryItem
                          key={item.type}
                          item={item}
                          onDragStart={(clientX, clientY) =>
                            setLibraryDrag({ type: item.type, clientX, clientY })
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-md text-[12px] font-medium tracking-[0.08em] uppercase transition ${
        active ? 'bg-paper-deep text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function ToolButton({
  active,
  label,
  shortcut,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  shortcut?: string
  icon: BuildTool
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
        active ? 'bg-paper-deep text-ink' : 'text-ink hover:bg-paper-deep/70'
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#efe8dc] text-ink">
        <ToolIcon id={icon} />
      </span>
      <span className="flex-1 text-[13px]">{label}</span>
      {shortcut ? <span className="text-[11px] text-muted">{shortcut}</span> : null}
    </button>
  )
}

function ToolIcon({ id }: { id: BuildTool }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
  }
  switch (id) {
    case 'select':
      return (
        <svg {...common}>
          <path d="M3.5 2.5 6 13.5 8 9.5 12.5 13 13.5 12 9 8 13.5 6z" />
        </svg>
      )
    case 'wall':
      return (
        <svg {...common}>
          <path d="M2 12.5 12.5 2" />
          <path d="M4.2 14.2 14.2 4.2" />
        </svg>
      )
    case 'door':
      return (
        <svg {...common}>
          <path d="M3 13V4h7v9" />
          <path d="M10 4c3 2.2 3 6.8 0 9" strokeDasharray="1.6 1.4" />
        </svg>
      )
    case 'window':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="10" height="8" />
          <path d="M8 4v8M3 8h10" />
        </svg>
      )
    case 'outlet':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5" />
          <path d="M6 6.5v3M10 6.5v3" />
        </svg>
      )
    case 'switch':
      return (
        <svg {...common}>
          <rect x="4" y="3.5" width="8" height="9" rx="1" />
          <path d="M8 6v4" />
        </svg>
      )
    case 'column':
      return (
        <svg {...common}>
          <rect x="4.5" y="4.5" width="7" height="7" />
        </svg>
      )
    case 'measure':
      return (
        <svg {...common}>
          <path d="M2.5 11.5 11.5 2.5" />
          <path d="M2.5 9.5v2h2M9.5 2.5h2v2" />
        </svg>
      )
    case 'radiator':
      return (
        <svg {...common}>
          <path d="M3 5h10v6H3zM5 5v6M7.5 5v6M10 5v6M12.5 5v6" />
        </svg>
      )
    case 'vent':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="10" height="6" />
          <path d="M4.5 7h7M4.5 9h7" />
        </svg>
      )
    case 'cabinet':
      return (
        <svg {...common}>
          <rect x="3" y="3.5" width="10" height="9" />
          <path d="M8 3.5v9M3 8h10" />
        </svg>
      )
    case 'counter':
      return (
        <svg {...common}>
          <path d="M2.5 6.5h11v4h-11zM2.5 6.5h11" strokeWidth="1.8" />
        </svg>
      )
    default:
      return null
  }
}

function LibraryItem({
  item,
  onDragStart,
}: {
  item: CatalogItem
  onDragStart: (clientX: number, clientY: number) => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <button
      type="button"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        onDragStart(event.clientX, event.clientY)
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
        hover ? 'bg-paper-deep' : ''
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-md bg-[#efe8dc]">
        <FurnitureSvg
          renderer={item.renderer}
          width={item.width}
          depth={item.depth}
          color={item.color}
          shape={item.shape}
          shapeData={item.shapeData}
          className="h-9 w-9"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] text-ink">{item.name}</p>
        <p className="text-[11px] text-muted">
          {item.shape === 'circle'
            ? `${formatLength(item.width)} dia × ${formatLength(item.height)}`
            : item.shape === 'lShape'
              ? `${formatLength(item.width)} × ${formatLength(item.depth)}`
              : `${formatLength(item.width)} × ${formatLength(item.depth)} × ${formatLength(item.height)}`}
        </p>
      </div>
    </button>
  )
}
