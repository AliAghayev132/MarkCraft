// ── @lib ───────────────────────────────────────────────────────────────────
import { useMemo, useState } from '@lib/react'

// ── @store ─────────────────────────────────────────────────────────────────
import { readerModeExited, useAppDispatch } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { emojiPicker } from '@features/emoji'

// ── types ──────────────────────────────────────────────────────────────────
import type { OverlayId, Overlays } from './types'

const IDS: OverlayId[] = [
  'palette',
  'settings',
  'export',
  'share',
  'find',
  'stats',
  'history',
  'present',
  'devTools',
  'links',
  'website',
  'templates',
  'book',
  'study',
  'canvas',
  'http',
  'help'
]

/**
 * Which of the application's overlays is on screen.
 *
 * One hook rather than a dozen `useState` lines in `App`, because they are the
 * same kind of thing and were only ever declared separately. Collecting them
 * also puts the rule that opening any of them leaves reading mode in one place
 * — it was repeated at every call site, and a new overlay that forgot it looked
 * like a shortcut that did nothing.
 */
export function useOverlays(): Overlays {
  const dispatch = useAppDispatch()

  const [open, setOpen] = useState<Record<OverlayId, boolean>>(
    () => Object.fromEntries(IDS.map((id) => [id, false])) as Record<OverlayId, boolean>
  )

  // `find` has a second axis — whether it opened for replace — which belongs
  // with it rather than as a loose flag beside it.
  const [replacing, setReplacing] = useState(false)

  return useMemo(() => {
    const set = (id: OverlayId, value: boolean): void => {
      setOpen((at) => (at[id] === value ? at : { ...at, [id]: value }))
    }

    const show = (id: OverlayId): void => {
      dispatch(readerModeExited())
      set(id, true)
    }

    return {
      open,
      replacing,
      show,
      hide: (id) => set(id, false),
      showFind: (replace) => {
        setReplacing(replace)
        show('find')
      },
      showEmoji: () => {
        dispatch(readerModeExited())
        emojiPicker.open()
      }
    }
  }, [open, replacing, dispatch])
}
