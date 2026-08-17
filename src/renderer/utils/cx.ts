// ── types ──────────────────────────────────────────────────────────────────
import type { ClassValue } from '@utils/types'

/** Minimal class-name joiner. A dependency for this would be silly. */
export function cx(...values: ClassValue[]): string {
  let result = ''
  for (const value of values) {
    if (!value) continue
    result = result ? `${result} ${value}` : value
  }
  return result
}
