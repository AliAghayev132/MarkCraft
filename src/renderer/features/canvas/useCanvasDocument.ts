// ── @lib ───────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { parseCanvas, serialiseCanvas, EMPTY_CANVAS, type CanvasData } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { toast } from '@services'

// ── ./canvas ───────────────────────────────────────────────────────────────
import { readCanvas, writeCanvas } from './canvas-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasDocument } from './types'

/** Deep enough to cover a session's work, shallow enough to stay small. */
const HISTORY_LIMIT = 50

/**
 * The canvas file: reading it when the view opens, writing it back, and the
 * undo stack over the top.
 *
 * `edit` is the only way the canvas changes, which is what makes undo possible
 * at all — every operation in the view goes through it, so there is no path
 * that changes the document without the previous state being kept.
 */
export function useCanvasDocument(open: boolean): CanvasDocument {
  const t = useT()

  const [canvas, setCanvas] = useState<CanvasData>(EMPTY_CANVAS)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [depth, setDepth] = useState(0)

  /*
   * Both refs mirror state rather than replacing it. `edit` reads them instead
   * of closing over the values, which keeps its identity stable — the view's
   * keyboard listener depends on it, and an `edit` that changed on every card
   * move would tear down and re-register that listener on every pointer event.
   */
  const canvasRef = useRef<CanvasData>(EMPTY_CANVAS)
  const historyRef = useRef<CanvasData[]>([])

  const apply = useCallback((next: CanvasData): void => {
    canvasRef.current = next
    setCanvas(next)
  }, [])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)

    void readCanvas()
      .then((json) => {
        if (cancelled) return

        apply(parseCanvas(json))
        historyRef.current = []
        setDepth(0)
        setDirty(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, apply])

  /**
   * `coalesce` is for the middle of a drag: a hundred pointer moves are one
   * thing the user did, and undo should return the card to where it started
   * rather than stepping back through every pixel of the way there.
   */
  const edit = useCallback(
    (change: (canvas: CanvasData) => CanvasData, coalesce = false): void => {
      const current = canvasRef.current
      const next = change(current)
      if (next === current) return

      if (!coalesce) {
        historyRef.current = [...historyRef.current.slice(-(HISTORY_LIMIT - 1)), current]
        setDepth(historyRef.current.length)
      }

      apply(next)
      setDirty(true)
    },
    [apply]
  )

  const undo = useCallback((): void => {
    const previous = historyRef.current.at(-1)
    if (!previous) return

    historyRef.current = historyRef.current.slice(0, -1)
    setDepth(historyRef.current.length)
    apply(previous)
    setDirty(true)
  }, [apply])

  const save = useCallback(async (): Promise<void> => {
    const path = await writeCanvas(serialiseCanvas(canvasRef.current))
    if (path) {
      setDirty(false)
      toast.success(t('canvas.saved'))
    }
  }, [t])

  return { canvas, dirty, loading, canUndo: depth > 0, edit, undo, save }
}
