// ── @shared ────────────────────────────────────────────────────────────────
import { rankSlash } from '@shared'

// ── @hooks ─────────────────────────────────────────────────────────────────
import type { AnchorRect } from '@hooks/types'

// ── @features ──────────────────────────────────────────────────────────────
import { slashBlocks } from './blocks'

// ── types ──────────────────────────────────────────────────────────────────
import type { SlashState } from './types'

/**
 * Whether the `/` menu is on screen, and what it is showing.
 *
 * Outside React because the two halves live on opposite sides: a CodeMirror
 * extension decides when it opens and which item is highlighted, while React
 * draws it. Routing per-keystroke state through the store would re-render the
 * editor's whole subtree on every character typed.
 */
const listeners = new Set<() => void>()
let state: SlashState | null = null

function emit(): void {
  for (const listener of listeners) listener()
}

export interface SlashTriggerInput {
  query: string
  from: number
  to: number
  anchor: AnchorRect
}

export const slashMenu = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  get(): SlashState | null {
    return state
  },

  isOpen(): boolean {
    return state !== null
  },

  /**
   * Opens, or updates what is already open, for the trigger under the caret.
   *
   * A query that matches nothing closes the menu instead of showing an empty
   * box — the user is writing prose that happens to start with a slash, and a
   * "no results" panel following the caret would be in the way.
   */
  show(trigger: SlashTriggerInput): void {
    const items = rankSlash(slashBlocks(), trigger.query)
    if (items.length === 0) {
      this.close()
      return
    }

    // The ranking changes as the query does, so the highlight has to follow the
    // item rather than the row: keeping index 2 would silently point at
    // something else once a keystroke reorders the list.
    const previous = state ? state.items[state.index]?.id : null
    const kept = items.findIndex((item) => item.id === previous)

    state = {
      from: trigger.from,
      to: trigger.to,
      anchor: trigger.anchor,
      items,
      index: kept === -1 ? 0 : kept
    }
    emit()
  },

  close(): void {
    if (state === null) return
    state = null
    emit()
  },

  /** Wraps, so Up from the first item reaches the last. */
  move(delta: number): void {
    if (!state) return
    const count = state.items.length
    state = { ...state, index: (state.index + delta + count) % count }
    emit()
  },

  highlight(index: number): void {
    if (!state || index === state.index) return
    state = { ...state, index }
    emit()
  },

  selected(): SlashState['items'][number] | null {
    return state ? (state.items[state.index] ?? null) : null
  }
}
