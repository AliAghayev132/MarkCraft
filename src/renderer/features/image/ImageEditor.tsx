// ── @lib ───────────────────────────────────────────────────────────────────
import { Crop, ImageIcon } from '@icons'
import { useEffect, useRef, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  formatBytes,
  processedName,
  rectFromDrag,
  toSourceRect,
  type Rect
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Field, Modal, ModalActions, Slider, Switch } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { loadImage, processImage, stripDataUrl } from './process'

// ── types ──────────────────────────────────────────────────────────────────
import type { ImageEditorProps } from './types'

const MAX_WIDTHS = [0, 800, 1200, 1600, 2400]

/**
 * The selection, in the image's own pixels.
 *
 * Shared by the estimate and by the apply, because they must agree: the
 * selection is drawn on the `<img>` as it is displayed, which is smaller than
 * the file. Measuring against the loaded image instead — its `width` is its
 * natural width — would report a size for a crop the user never made.
 */
function cropInSourcePixels(
  selection: Rect | null,
  displayed: HTMLImageElement | null,
  loaded: HTMLImageElement
): Rect | null {
  if (!selection) return null

  return toSourceRect(
    selection,
    {
      width: displayed?.clientWidth || loaded.naturalWidth,
      height: displayed?.clientHeight || loaded.naturalHeight
    },
    { width: loaded.naturalWidth, height: loaded.naturalHeight }
  )
}

/**
 * Crop and compress before an image reaches the document.
 *
 * The point at which it is worth doing: once the file has been copied into the
 * asset folder and linked, shrinking it means finding it again and fixing a
 * link. Here it is one dialog, and the size the user is about to commit to is
 * on screen while they decide.
 */
export function ImageEditor({
  open,
  source,
  name,
  originalBytes,
  onCancel,
  onApply
}: ImageEditorProps): ReactElement | null {
  const t = useT()

  const [compress, setCompress] = useState(true)
  const [quality, setQuality] = useState(0.82)
  const [maxWidth, setMaxWidth] = useState(1600)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [estimate, setEstimate] = useState<{ bytes: number; width: number; height: number } | null>(null)
  const [busy, setBusy] = useState(false)

  const imageRef = useRef<HTMLImageElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  // Re-estimating on every drag pixel would re-encode the image continuously;
  // the settings are what move the number, and they change one at a time.
  useEffect(() => {
    if (!open || !source) return

    let cancelled = false
    void (async () => {
      try {
        const image = await loadImage(source)
        const result = await processImage(image, {
          crop: cropInSourcePixels(selection, imageRef.current, image),
          maxWidth,
          compress,
          quality
        })
        if (!cancelled) {
          setEstimate({ bytes: result.bytes, width: result.width, height: result.height })
        }
      } catch {
        if (!cancelled) setEstimate(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, source, compress, quality, maxWidth, selection])

  if (!open || !source) return null

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect()
    dragStart.current = { x: event.clientX - box.left, y: event.clientY - box.top }
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelection(null)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const start = dragStart.current
    if (!start) return

    const box = event.currentTarget.getBoundingClientRect()
    setSelection(rectFromDrag(start.x, start.y, event.clientX - box.left, event.clientY - box.top))
  }

  const onPointerUp = (): void => {
    dragStart.current = null
    // A click rather than a drag means "no crop", not a one-pixel crop.
    setSelection((at) => (at && at.width > 8 && at.height > 8 ? at : null))
  }

  const apply = async (): Promise<void> => {
    setBusy(true)
    try {
      const image = await loadImage(source)
      const result = await processImage(image, {
        crop: cropInSourcePixels(selection, imageRef.current, image),
        maxWidth,
        compress,
        quality
      })
      onApply({
        base64: stripDataUrl(result.dataUrl),
        name: processedName(name, compress),
        width: result.width,
        height: result.height,
        bytes: result.bytes
      })
    } finally {
      setBusy(false)
    }
  }

  const saved = estimate ? originalBytes - estimate.bytes : 0

  return (
    <Modal
      open
      onClose={onCancel}
      title={t('image.title')}
      description={name}
      icon={<Crop size={17} />}
      size="lg"
      footer={
        <ModalActions>
          <Button onClick={onCancel}>{t('common.cancel')}</Button>
          <Button variant="primary" disabled={busy} onClick={() => void apply()}>
            {t('image.apply')}
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-3">
        <div
          role="presentation"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative flex max-h-[320px] cursor-crosshair justify-center overflow-hidden rounded-lg border border-line bg-sunken select-none"
        >
          <img
            ref={imageRef}
            src={source}
            alt={t('image.preview')}
            draggable={false}
            className="max-h-[320px] w-auto object-contain"
          />

          {selection ? (
            <div
              aria-hidden
              className="pointer-events-none absolute border-2 border-accent bg-accent/10"
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height
              }}
            />
          ) : null}
        </div>

        <p className="m-0 flex items-center justify-between text-xs text-ink-tertiary">
          <span>{selection ? t('image.cropSet') : t('image.cropHint')}</span>
          {selection ? (
            <Button size="sm" variant="ghost" onClick={() => setSelection(null)}>
              {t('image.cropClear')}
            </Button>
          ) : null}
        </p>

        <Field label={t('image.compress')} hint={t('image.compressHint')}>
          <Switch checked={compress} onChange={setCompress} label={t('image.compress')} />
        </Field>

        {compress ? (
          <Field label={t('image.quality', { percent: Math.round(quality * 100) })}>
            <Slider
              min={30}
              max={100}
              step={1}
              value={Math.round(quality * 100)}
              onChange={(value) => setQuality(value / 100)}
              ariaLabel={t('image.quality', { percent: Math.round(quality * 100) })}
            />
          </Field>
        ) : null}

        <Field label={t('image.maxWidth')}>
          <div className="flex flex-wrap gap-1.5">
            {MAX_WIDTHS.map((width) => (
              <Button
                key={width}
                size="sm"
                variant={maxWidth === width ? 'subtle' : 'secondary'}
                onClick={() => setMaxWidth(width)}
              >
                {width === 0 ? t('image.original') : `${width}px`}
              </Button>
            ))}
          </div>
        </Field>

        <p
          aria-live="polite"
          className="m-0 flex items-center gap-2 rounded-md border border-line bg-sunken px-2.5 py-2 text-xs text-ink-secondary"
        >
          <ImageIcon size={13} className="flex-none text-ink-tertiary" />
          {estimate
            ? t('image.result', {
                width: estimate.width,
                height: estimate.height,
                size: formatBytes(estimate.bytes),
                // Negative savings are shown as such: compressing an already
                // small PNG can make it bigger, and hiding that would be a lie.
                delta:
                  saved === 0
                    ? '—'
                    : `${saved > 0 ? '−' : '+'}${formatBytes(Math.abs(saved))}`
              })
            : t('image.measuring')}
        </p>
      </div>
    </Modal>
  )
}
