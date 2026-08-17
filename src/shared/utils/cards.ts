/**
 * Flashcards read out of a document.
 *
 * The cards live in the Markdown, not in a sidecar database. A note someone
 * already wrote becomes revisable by adding a separator to it, and stays a
 * readable note afterwards — which is the whole reason to put study mode in an
 * editor rather than ship another flashcard app.
 *
 * Two forms, both already in use in the Markdown world:
 *
 *   Term :: definition          — one line, for vocabulary and quick facts
 *
 *   What is a monad?            — a block, for anything that needs room
 *   ?
 *   A monoid in the category…
 */
export interface Card {
  front: string
  back: string
  /** 1-based line of the card's first line, so it can be edited. */
  line: number
}

const FENCE = /^\s*(```|~~~)/
const INLINE = /^(.*\S)\s+::\s+(\S.*)$/
const SEPARATOR = /^\s*\?\s*$/

export function parseCards(markdown: string): Card[] {
  const lines = markdown.split('\n')
  const cards: Card[] = []

  let inFence = false
  let marker = ''

  // A block card is collected until the blank line after its answer.
  let front: string[] = []
  let back: string[] | null = null
  let startLine = 0

  const finish = (): void => {
    if (back !== null) {
      const question = front.join('\n').trim()
      const answer = back.join('\n').trim()
      if (question !== '' && answer !== '') cards.push({ front: question, back: answer, line: startLine })
    }
    front = []
    back = null
  }

  lines.forEach((line, index) => {
    const fence = line.match(FENCE)
    if (fence) {
      if (!inFence) {
        inFence = true
        marker = fence[1]
      } else if (line.trim().startsWith(marker)) {
        inFence = false
      }
      if (back !== null) back.push(line)
      else if (front.length > 0) front.push(line)
      return
    }

    // A card inside a fenced block is an example of the syntax, not a card.
    if (inFence) {
      if (back !== null) back.push(line)
      else if (front.length > 0) front.push(line)
      return
    }

    if (SEPARATOR.test(line) && front.length > 0 && back === null) {
      back = []
      return
    }

    if (line.trim() === '') {
      finish()
      return
    }

    if (back !== null) {
      back.push(line)
      return
    }

    // An inline card is complete on its own line and cannot start a block.
    const inline = line.match(INLINE)
    if (inline && front.length === 0) {
      cards.push({ front: inline[1].trim(), back: inline[2].trim(), line: index + 1 })
      return
    }

    if (front.length === 0) startLine = index + 1
    front.push(line)
  })

  finish()

  return cards
}

/* ────────────────────────────────────────────────────────────────────────────
 * Scheduling
 * ─────────────────────────────────────────────────────────────────────────── */

/** What the reviewer said about a card. */
export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface CardState {
  /** Days until the next review. */
  interval: number
  /** How quickly the interval grows — SM-2's ease factor. */
  ease: number
  /** Consecutive successful reviews; reset by `again`. */
  streak: number
}

export const NEW_CARD: CardState = { interval: 0, ease: 2.5, streak: 0 }

const DAY = 24 * 60 * 60 * 1000

/**
 * SM-2, trimmed to what a text editor can honestly support.
 *
 * The full algorithm tracks a per-card history this application has no place to
 * keep and no way to migrate. What survives is the part that does the work: a
 * wrong answer sends the card back to the start of the day, a right one grows
 * the gap, and the growth rate itself moves with how hard the card felt.
 */
export function schedule(state: CardState, grade: Grade): CardState {
  if (grade === 'again') {
    // Not tomorrow: today, after everything else. Forgetting a card and being
    // shown it again a day later is how a deck rots.
    return { interval: 0, ease: Math.max(1.3, state.ease - 0.2), streak: 0 }
  }

  const ease =
    grade === 'hard'
      ? Math.max(1.3, state.ease - 0.15)
      : grade === 'easy'
        ? state.ease + 0.15
        : state.ease

  const streak = state.streak + 1
  const interval =
    streak === 1 ? 1 : streak === 2 ? 6 : Math.round(state.interval * ease * (grade === 'hard' ? 0.6 : 1))

  return { interval: Math.max(1, interval), ease, streak }
}

/** When a card graded now would next be due, as a timestamp. */
export function dueAt(state: CardState, now: number): number {
  return now + state.interval * DAY
}

/** The cards to review, soonest-due first; never-seen cards come first. */
export function dueNow<T extends { due: number }>(cards: T[], now: number): T[] {
  return cards.filter((card) => card.due <= now).sort((a, b) => a.due - b.due)
}

/** A card's schedule as it is stored: its state plus when it is next due. */
export interface StudyRecord extends CardState {
  due: number
}

/**
 * A card's stable identity.
 *
 * Its text, hashed — so the stored schedule holds no copy of the user's notes
 * and stays small, while a card keeps its history through any amount of
 * rewriting around it.
 *
 * FNV-1a rather than SHA-256 on purpose: this is a lookup key, not a security
 * boundary, and it has to be computed identically in main *and* in the renderer.
 * A synchronous function both sides import is the only way the two can agree —
 * `crypto.subtle` is async and node's `createHash` is not in the renderer.
 */
export function cardKey(front: string, back: string): string {
  const text = `${front.trim()} ${back.trim()}`

  let hash = 0x811c9dc5
  for (let at = 0; at < text.length; at++) {
    hash ^= text.charCodeAt(at)
    // The FNV prime, applied with shifts so it stays inside 32 bits.
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0
  }

  return hash.toString(16).padStart(8, '0')
}
