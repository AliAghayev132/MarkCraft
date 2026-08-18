// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { CUSTOM_COLOR_TOKENS } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { onMainEvent } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { resolveTheme, systemThemeChanged, useAppDispatch, useAppSelector } from '@store'

/**
 * Reflects appearance settings onto the document root as data attributes.
 *
 * Theming is done entirely through CSS custom properties keyed off these
 * attributes — which is also what the Tailwind theme bridge reads — so
 * switching theme, accent or density is a single attribute write with no React
 * re-render of the tree below.
 */
export function useAppearance(): void {
  const dispatch = useAppDispatch()
  const settings = useAppSelector((state) => state.settings.values)
  const systemPrefersDark = useAppSelector((state) => state.settings.systemPrefersDark)

  /* The OS preference reaches us from two directions: the media query in the
     renderer and `nativeTheme` in main. Either is enough; both is harmless. */
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent): void => {
      dispatch(systemThemeChanged(event.matches))
    }
    query.addEventListener('change', onChange)

    const off = onMainEvent('event:systemTheme', ({ shouldUseDark }) =>
      dispatch(systemThemeChanged(shouldUseDark))
    )

    return () => {
      query.removeEventListener('change', onChange)
      off()
    }
  }, [dispatch])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolveTheme(settings, systemPrefersDark)
    root.dataset.accent = settings.appearance.accent
    root.dataset.density = settings.appearance.uiDensity
    root.dataset.reduceMotion = String(settings.appearance.reduceMotion)
    root.dataset.palette = settings.appearance.palette
  }, [settings, systemPrefersDark])

  /*
   * Per-token overrides.
   *
   * Written as inline custom properties on the root element, which is the one
   * place with higher precedence than every stylesheet rule — so an override
   * beats the theme *and* the palette without either having to know it exists.
   * Cleared before reapplying, or a token the user just reset would linger.
   */
  useEffect(() => {
    const root = document.documentElement
    const theme = resolveTheme(settings, systemPrefersDark)
    const overrides = settings.appearance.customColors[theme] ?? {}

    for (const token of CUSTOM_COLOR_TOKENS) root.style.removeProperty(`--mc-${token}`)

    for (const [token, value] of Object.entries(overrides)) {
      if (value) root.style.setProperty(`--mc-${token}`, value)
    }
  }, [settings, systemPrefersDark])

  /* Interface zoom. Read by the `ui-scaled` utility, which is applied to the
     chrome only — see styles/tailwind.css. */
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--mc-ui-scale',
      String(settings.appearance.uiScale)
    )
  }, [settings.appearance.uiScale])

  /* Editor typography is exposed as variables so CodeMirror, the rich editor
     and the preview all pick it up without prop drilling. */
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--mc-editor-font-family', settings.editor.fontFamily)
    root.style.setProperty('--mc-editor-font-size', `${settings.editor.fontSize}px`)
    root.style.setProperty('--mc-editor-line-height', String(settings.editor.lineHeight))
  }, [settings.editor.fontFamily, settings.editor.fontSize, settings.editor.lineHeight])
}
