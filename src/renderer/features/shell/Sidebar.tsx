// ── @lib ───────────────────────────────────────────────────────────────────
import { Clock, Trash2, FolderTree, List, Search, Settings } from '@icons'
import { useCallback, useEffect, useRef, type PointerEvent, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectSidebarView, sidebarViewChanged, useAppDispatch, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { TrashPanel } from '@features/trash'
import { FileExplorer } from '@features/explorer'
import { OutlinePanel } from '@features/outline'
import { RecentPanel } from './RecentPanel'
import { SearchPanel } from '@features/search'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { SidebarView } from '@store/slices/types'
import type { SidebarProps } from './types'

const MIN_WIDTH = 180
const MAX_WIDTH = 520

/** Accent marker on the active view, drawn outside the button's own box. */
const RAIL_BUTTON =
  'relative aria-pressed:before:absolute aria-pressed:before:-left-2 aria-pressed:before:inset-y-1.5 ' +
  'aria-pressed:before:w-0.5 aria-pressed:before:rounded-full aria-pressed:before:bg-accent aria-pressed:before:content-[""]'

/**
 * The activity rail plus the active panel.
 *
 * The rail stays visible even when the panel is collapsed, so the sidebar is
 * always one click from returning — a hidden-by-default sidebar with no
 * affordance is the classic way to lose a feature.
 */
export function Sidebar({
  homePath,
  onRevealMatch,
  onRevealLine,
  onOpenSettings
}: SidebarProps): ReactElement {
  const t = useT()
  const dispatch = useAppDispatch()

  const view = useAppSelector(selectSidebarView)
  const visible = useAppSelector((state) => state.settings.values.appearance.sidebarVisible)
  const width = useAppSelector((state) => state.settings.values.appearance.sidebarWidth)

  const handleRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)

  const views: { id: SidebarView; icon: ReactElement; label: string; shortcut?: string }[] = [
    { id: 'explorer', icon: <FolderTree size={17} />, label: t('sidebar.explorer'), shortcut: 'mod+shift+e' },
    { id: 'outline', icon: <List size={17} />, label: t('sidebar.outline'), shortcut: 'mod+shift+u' },
    { id: 'search', icon: <Search size={17} />, label: t('sidebar.search'), shortcut: 'mod+shift+f' },
    { id: 'recent', icon: <Clock size={17} />, label: t('sidebar.recent') },
    { id: 'trash', icon: <Trash2 size={17} />, label: t('sidebar.trash') }
  ]

  /**
   * Written straight to the DOM during the drag and persisted on release, so
   * dragging does not thrash the settings file 60 times a second.
   */
  const setWidth = useCallback((next: number): number => {
    const clamped = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)))
    document.documentElement.style.setProperty('--mc-sidebar-width', `${clamped}px`)
    return clamped
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--mc-sidebar-width', `${width}px`)
  }, [width])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.preventDefault()
    draggingRef.current = true
    handleRef.current?.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'col-resize'
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return
    const left = handleRef.current?.parentElement?.getBoundingClientRect().left ?? 0
    setWidth(event.clientX - left)
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return
    draggingRef.current = false
    handleRef.current?.releasePointerCapture(event.pointerId)
    document.body.style.cursor = ''

    const applied = Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--mc-sidebar-width'),
      10
    )
    if (Number.isFinite(applied)) {
      void updateSettings({ appearance: { sidebarWidth: applied } })
    }
  }

  return (
    <div className="flex min-h-0 flex-none border-r border-line-subtle bg-sunken">
      {/* The rail and the panel carry the interface zoom; the resize handle
          below deliberately does not, because it measures real screen pixels. */}
      <nav
        className="ui-scaled flex w-[46px] flex-none flex-col items-center gap-1 border-r border-line-subtle bg-app py-2"
        aria-label={t('sidebar.views')}
      >
        {views.map((entry) => (
          <IconButton
            key={entry.id}
            icon={entry.icon}
            label={entry.label}
            shortcut={entry.shortcut}
            size="lg"
            tooltipPlacement="right"
            active={visible && view === entry.id}
            className={RAIL_BUTTON}
            onClick={() => {
              // Clicking the active view collapses the panel, the way a rail is
              // expected to behave.
              if (visible && view === entry.id) {
                void updateSettings({ appearance: { sidebarVisible: false } })
                return
              }
              dispatch(sidebarViewChanged(entry.id))
              if (!visible) void updateSettings({ appearance: { sidebarVisible: true } })
            }}
          />
        ))}

        <div className="flex-1" />

        <IconButton
          icon={<Settings size={17} />}
          label={t('sidebar.settings')}
          shortcut="mod+,"
          size="lg"
          tooltipPlacement="right"
          className={RAIL_BUTTON}
          onClick={onOpenSettings}
        />
      </nav>

      {visible ? (
        <div className="relative flex min-h-0 w-[var(--mc-sidebar-width,264px)] min-w-[var(--mc-sidebar-min-width)] max-w-[var(--mc-sidebar-max-width)]">
          <div
            className={cx(
              'ui-scaled flex min-h-0 min-w-0 flex-1 flex-col',
              view === 'explorer' ? 'pt-0' : 'pt-1.5'
            )}
          >
            {view === 'explorer' ? <FileExplorer homePath={homePath} /> : null}
            {view === 'outline' ? <OutlinePanel onRevealLine={onRevealLine} /> : null}
            {view === 'search' ? (
              <SearchPanel homePath={homePath} onRevealMatch={onRevealMatch} />
            ) : null}
            {view === 'recent' ? <RecentPanel homePath={homePath} /> : null}
            {view === 'trash' ? <TrashPanel /> : null}
          </div>

          <div
            ref={handleRef}
            role="separator"
            aria-orientation="vertical"
            aria-label={t('sidebar.resize')}
            aria-valuenow={width}
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={MAX_WIDTH}
            tabIndex={0}
            className={cx(
              'absolute inset-y-0 -right-[3px] z-[var(--mc-z-drag-handle)] w-1.5 cursor-col-resize touch-none focus-visible:outline-none',
              'after:absolute after:inset-y-0 after:inset-x-0.5 after:bg-transparent after:transition-colors after:content-[""]',
              'hover:after:bg-accent-line focus-visible:after:bg-accent-line'
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={() => void updateSettings({ appearance: { sidebarWidth: 264 } })}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 32 : 8
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                void updateSettings({ appearance: { sidebarWidth: setWidth(width - step) } })
              } else if (event.key === 'ArrowRight') {
                event.preventDefault()
                void updateSettings({ appearance: { sidebarWidth: setWidth(width + step) } })
              }
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
