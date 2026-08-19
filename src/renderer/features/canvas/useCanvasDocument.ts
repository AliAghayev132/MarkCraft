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
 * The canvas file: reading it when one is opened, writing it back, and the
 * undo stack over the top.
 *
 * `edit` is the only way the canvas changes, which is what makes undo possible
 * at all — every operation in the view goes through it, so there is no path
 * that changes the document without the previous state being kept.
 */
export function useCanvasDocument(path: string | null): CanvasDocument {
  const t = useT()

  const [canvas, setCanvas] = useState<CanvasData>(EMPTY_CANVAS)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [depth, setDepth] = useState({ undo: 0, redo: 0 })

  /*
   * The refs mirror state rather than replacing it. `edit` reads them instead
   * of closing over the values, which keeps its identity stable — the view's
   * keyboard listener depends on it, and an `edit` that changed on every card
   * move would tear down and re-register that listener on every pointer event.
   */
  const canvasRef = useRef<CanvasData>(EMPTY_CANVAS)
  const undoRef = useRef<CanvasData[]>([])
  const redoRef = useRef<CanvasData[]>([])

  const apply = useCallback((next: CanvasData): void => {
    canvasRef.current = next
    setCanvas(next)
  }, [])

  const remember = useCallback((): void => {
    setDepth({ undo: undoRef.current.length, redo: redoRef.current.length })
  }, [])

  useEffect(() => {
    if (path === null) return

    let cancelled = false
    setLoading(true)

    void readCanvas(path)
      .then((json) => {
        if (cancelled) return

        apply(parseCanvas(json))
        undoRef.current = []
        redoRef.current = []
        remember()
        setDirty(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path, apply, remember])

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
        undoRef.current = [...undoRef.current.slice(-(HISTORY_LIMIT - 1)), current]
        // A new edit is a new branch: what was undone is no longer ahead.
        redoRef.current = []
        remember()
      }

      apply(next)
      setDirty(true)
    },
    [apply, remember]
  )

  const undo = useCallback((): void => {
    const previous = undoRef.current.at(-1)
    if (!previous) return

    undoRef.current = undoRef.current.slice(0, -1)
    redoRef.current = [...redoRef.current, canvasRef.current]
    remember()
    apply(previous)
    setDirty(true)
  }, [apply, remember])

  const redo = useCallback((): void => {
    const next = redoRef.current.at(-1)
    if (!next) return

    redoRef.current = redoRef.current.slice(0, -1)
    undoRef.current = [...undoRef.current, canvasRef.current]
    remember()
    apply(next)
    setDirty(true)
  }, [apply, remember])

  const save = useCallback(async (): Promise<void> => {
    if (path === null) return

    if (await writeCanvas(path, serialiseCanvas(canvasRef.current))) {
      setDirty(false)
      toast.success(t('canvas.saved'))
    }
  }, [path, t])

  return {
    canvas,
    dirty,
    loading,
    canUndo: depth.undo > 0,
    canRedo: depth.redo > 0,
    edit,
    undo,
    redo,
    save
  }
}
