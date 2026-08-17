// ── @shared ────────────────────────────────────────────────────────────────
import { cardKey, type Card } from '@shared'

/** The key main stores a card's schedule under. */
export function keyOf(card: Card): string {
  return cardKey(card.front, card.back)
}
