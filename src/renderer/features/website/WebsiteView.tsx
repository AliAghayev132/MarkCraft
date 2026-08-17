// ── @lib ───────────────────────────────────────────────────────────────────
import { Globe, X, ZoomIn, ZoomOut } from '@icons'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @shared ────────────────────────────────────────────────────────────────
import { dirname } from '@shared'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectActiveDocument, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton, Segmented } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @features ──────────────────────────────────────────────────────────────
import { renderMarkdown } from '@features/editor/markdown'

// ── types ──────────────────────────────────────────────────────────────────
import type { Device, WebsiteViewProps } from './types'

/*
 * Real device widths rather than round numbers. 390 is an iPhone 14, 768 an
 * iPad in portrait, 1280 a laptop — a document that reads at those three reads
 * everywhere, and a made-up 400 would quietly miss the phone everyone has.
 */
const DEVICES: Device[] = [
  { id: 'phone', width: 390, height: 844 },
  { id: 'tablet', width: 768, height: 1024 },
  { id: 'laptop', width: 1280, height: 800 }
]

/**
 * The document as a page, at the widths it will be read at.
 *
 * The frame is a real element of that pixel width, not a scaled screenshot, so
 * the text wraps and the tables overflow exactly as they will for a reader —
 * which is the only question this view exists to answer. Scaling is applied to
 * the frame afterwards purely so a 1280px layout fits on screen; the layout
 * itself is computed at full size.
 */
export function WebsiteView({ open, onClose }: WebsiteViewProps): ReactElement | null {
  const t = useT()
  const document_ = useAppSelector(selectActiveDocument)
  const settings = useAppSelector((state) => state.settings.values.markdown)

  const [device, setDevice] = useState('tablet')
  const [zoom, setZoom] = useState(1)
  const [autoZoom, setAutoZoom] = useState(true)

  const stage = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)

  const active = DEVICES.find((entry) => entry.id === device) ?? DEVICES[1]

  const rendered = useMemo(
    () =>
      renderMarkdown(document_?.content ?? '', {
        baseDir: document_?.path ? dirname(document_.path) : null,
        gfm: settings.gfm,
        highlight: settings.codeHighlighting
      }),
    [document_?.content, document_?.path, settings.gfm, settings.codeHighlighting]
  )

  /* A laptop frame is wider than the window it is being previewed in; shrinking
     it to fit is the difference between a usable view and a horizontal scrollbar
     over a cut-off page. */
  useLayoutEffect(() => {
    if (!open || !autoZoom) return

    const fit = (): void => {
      const available = stage.current?.clientWidth
      if (!available) return
      setZoom(Math.min(1, (available - 48) / active.width))
    }

    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [open, autoZoom, active.width])

  useEffect(() => {
    if (!open) return

    const previous = document.activeElement
    surface.current?.focus()

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open, onClose])

  // Reopening at the last zoom would be confusing after the window was resized.
  useEffect(() => {
    if (open) setAutoZoom(true)
  }, [open])

  if (!open) return null

  const nudge = (delta: number): void => {
    setAutoZoom(false)
    setZoom((at) => Math.min(1.5, Math.max(0.25, Math.round((at + delta) * 20) / 20)))
  }

  return (
    <div
      ref={surface}
      role="dialog"
      aria-modal="true"
      aria-label={t('website.title')}
      tabIndex={-1}
      className="fixed inset-0 z-palette flex flex-col bg-app outline-none"
    >
      <div className="mc-no-drag flex flex-none items-center justify-between gap-3 border-b border-line px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <Globe size={15} className="text-ink-tertiary" />
          {document_?.title ?? t('website.title')}
        </span>

        <Segmented
          value={device}
          onChange={(next) => {
            setDevice(next)
            setAutoZoom(true)
          }}
          options={DEVICES.map((entry) => ({
            value: entry.id,
            label: t(`website.devices.${entry.id}`)
          }))}
        />

        <span className="flex items-center gap-1">
          <span className="pr-1 text-xs tabular-nums text-ink-tertiary">
            {active.width}px · {Math.round(zoom * 100)}%
          </span>
          <IconButton icon={<ZoomOut size={15} />} label={t('website.zoomOut')} onClick={() => nudge(-0.1)} />
          <IconButton icon={<ZoomIn size={15} />} label={t('website.zoomIn')} onClick={() => nudge(0.1)} />
          <IconButton icon={<X size={15} />} label={t('common.close')} onClick={onClose} />
        </span>
      </div>

      <div ref={stage} className="flex min-h-0 flex-1 justify-center overflow-auto bg-sunken p-6">
        <div
          /* The frame is laid out at its true width and only then scaled, so
             what is measured is what a reader would get. */
          style={{
            width: active.width,
            height: active.height,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center'
          }}
          className={cx(
            'flex-none overflow-y-auto overflow-x-hidden rounded-xl border border-line bg-app shadow-lg',
            'transition-[width,height] duration-150'
          )}
        >
          <article className="mc-document px-5 py-6">{rendered}</article>
        </div>
      </div>
    </div>
  )
}
