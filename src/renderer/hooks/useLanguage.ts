// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { applyLanguage } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { publishLocales, reloadCustomLocales } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { languageResolved, useAppDispatch, useAppSelector } from '@store'

/**
 * Keeps the active language in step with the stored preference, and loads any
 * user-supplied translation files.
 *
 * The preference lives in settings (so it persists) but is *applied* through
 * the i18n module and recorded in the i18n slice (so a change re-renders only
 * what displays text). This hook is the one place those are connected.
 */
export function useLanguage(): void {
  const dispatch = useAppDispatch()
  const preference = useAppSelector((state) => state.settings.values.language.preference)
  const language = useAppSelector((state) => state.i18n.language)
  const direction = useAppSelector((state) => state.i18n.direction)

  /* Built-in locales are known synchronously; custom ones are read once at
     startup, before the first paint matters. */
  useEffect(() => {
    publishLocales()
    void reloadCustomLocales()
  }, [])

  useEffect(() => {
    dispatch(languageResolved({ preference, ...applyLanguage(preference) }))
  }, [preference, dispatch])

  /* The OS language can change while the app is open. */
  useEffect(() => {
    const onLanguageChange = (): void => {
      dispatch(languageResolved({ preference, ...applyLanguage(preference) }))
    }
    window.addEventListener('languagechange', onLanguageChange)
    return () => window.removeEventListener('languagechange', onLanguageChange)
  }, [preference, dispatch])

  /* Reflected onto <html> so CSS and the OS text engine agree on direction. */
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = direction
  }, [language, direction])
}
