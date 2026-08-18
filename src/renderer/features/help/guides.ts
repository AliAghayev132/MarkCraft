// ── @features ──────────────────────────────────────────────────────────────
import { GUIDE_AZ } from './guide-az'
import { GUIDE_EN } from './guide-en'
import { GUIDE_RU } from './guide-ru'

// ── types ──────────────────────────────────────────────────────────────────
import type { GuideSection } from './types'

/**
 * The guide in the interface's language.
 *
 * English is the fallback rather than an error: a user who dropped in a fourth
 * locale should still get a guide, and a half-translated one would be worse
 * than an English one they can read.
 */
export function guideFor(language: string): GuideSection[] {
  if (language.startsWith('az')) return GUIDE_AZ
  if (language.startsWith('ru')) return GUIDE_RU
  return GUIDE_EN
}
