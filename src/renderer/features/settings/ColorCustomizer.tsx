// ── @lib ───────────────────────────────────────────────────────────────────
import { RotateCcw } from '@icons'
import { useEffect, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { CUSTOM_COLOR_TOKENS, type CustomColorToken } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, ColorPicker, IconButton } from '@ui'

/**
 * Hand-picked overrides for individual design tokens.
 *
 * Every swatch shows the colour that is *currently in effect* — resolved from
 * the live document, not from a table — so a theme change, a palette change and
 * a manual override all read the same way. Without that, an untouched token
 * would show a stale default the moment the user switched palette, and the
 * screen would be lying about what they are looking at.
 */
export function ColorCustomizer(): ReactElement {
  const t = useT()
  const appearance = useAppSelector((state) => state.settings.values.appearance)
  const [resolved, setResolved] = useState<Record<string, string>>({})

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement)
    const next: Record<string, string> = {}

    for (const token of CUSTOM_COLOR_TOKENS) {
      next[token] = toHex(styles.getPropertyValue(`--mc-${token}`).trim())
    }

    setResolved(next)
  }, [appearance.theme, appearance.palette, appearance.accent, appearance.customColors])

  const setToken = (token: CustomColorToken, value: string | undefined): void => {
    const next = { ...appearance.customColors }
    if (value) next[token] = value
    else delete next[token]

    /*
     * The whole map is replaced rather than patched, because the settings merge
     * is a deep one: patching could never *remove* a key, so "reset this
     * colour" would silently do nothing.
     */
    void updateSettings({ appearance: { customColors: next } })
  }

  const overridden = Object.keys(appearance.customColors).length

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {CUSTOM_COLOR_TOKENS.map((token) => {
          const custom = appearance.customColors[token]

          return (
            <label
              key={token}
              className="flex items-center gap-2 rounded-md border border-line-subtle bg-surface px-2 py-1.5"
            >
              <ColorPicker
                value={custom ?? resolved[token] ?? '#000000'}
                onChange={(hex) => setToken(token, hex)}
                label={t(`settings.appearance.tokens.${token}`)}
              />
              <span className="min-w-0 flex-1 truncate text-xs text-ink-secondary">
                {t(`settings.appearance.tokens.${token}`)}
              </span>
              {custom ? (
                <IconButton
                  icon={<RotateCcw size={12} />}
                  label={t('settings.appearance.resetColor')}
                  size="sm"
                  onClick={() => setToken(token, undefined)}
                />
              ) : null}
            </label>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={overridden === 0}
          onClick={() => void updateSettings({ appearance: { customColors: {} } })}
        >
          {t('settings.appearance.resetAllColors')}
        </Button>
        <span className="text-xs text-ink-tertiary">
          {overridden === 0
            ? t('settings.appearance.noOverrides')
            : t('settings.appearance.overrideCount', { count: overridden })}
        </span>
      </div>
    </div>
  )
}

/**
 * Normalises a resolved token to the `#rrggbb` the picker works in.
 *
 * Tokens are authored as hex, `rgba()` or a colour name depending on which
 * reads best in the stylesheet, and an alpha channel has to be dropped: the
 * picker has no way to represent one, and a translucent border is not something
 * a user should be editing as if it were opaque.
 */
function toHex(value: string): string {
  if (value.startsWith('#')) {
    return value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : value.slice(0, 7)
  }

  const parts = value.match(/[\d.]+/g)
  if (!parts || parts.length < 3) return '#000000'

  return `#${parts
    .slice(0, 3)
    .map((part) => Math.max(0, Math.min(255, Math.round(Number(part)))).toString(16).padStart(2, '0'))
    .join('')}`
}
