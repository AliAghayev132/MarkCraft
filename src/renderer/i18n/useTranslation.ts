// ── @lib ───────────────────────────────────────────────────────────────────
import { useMemo } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { getTranslator } from '@i18n/active'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── types ──────────────────────────────────────────────────────────────────
import type { TranslateFn, Translation } from '@i18n/types'

/**
 * The hook every component uses.
 *
 * It subscribes to the language *code* in the store — a short string that
 * changes once per language switch — and reads the translator from the i18n
 * module. So a component re-renders exactly when the language changes, and
 * never because a few thousand translation strings moved through React.
 */
/*
 * `language` is a deliberate dependency the linter cannot justify: the
 * translator lives in module state, and the language code is the *signal* that
 * it was rebuilt. Without it the memo would hand back a stale translator for
 * the rest of the session.
 */

export function useT(): TranslateFn {
  const language = useAppSelector((state) => state.i18n.language)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getTranslator(), [language])
}

export function useTranslation(): Translation {
  const language = useAppSelector((state) => state.i18n.language)
  const direction = useAppSelector((state) => state.i18n.direction)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(() => getTranslator(), [language])

  return { t, language, direction }
}
