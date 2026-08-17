// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  UI_SCALE_STEP,
  clampUiScale,
  type AccentName,
  type PaletteName
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { resolveTheme, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Divider, Segmented, Select, Slider, Switch } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { ColorCustomizer, SettingsRow, ToolbarCustomizer } from '@features/settings'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { SectionProps } from './types'

/**
 * Swatch colours.
 *
 * The live `--mc-accent` variable only ever holds the *selected* accent, so a
 * swatch painted with it would show seven identical dots. These are the same
 * values the theme defines, listed per mode so every option previews the colour
 * it will actually apply.
 */
/** Ordered so the default sits first and the accessibility option sits last. */
const PALETTES: PaletteName[] = [
  'default',
  'nord',
  'solarized',
  'gruvbox',
  'rosePine',
  'sepia',
  'highContrast'
]

const ACCENT_PREVIEW: Record<AccentName, { light: string; dark: string }> = {
  indigo: { light: '#4f5cd6', dark: '#7e8aff' },
  blue: { light: '#2f6fd0', dark: '#5c9dff' },
  teal: { light: '#0f7f78', dark: '#3bbfb2' },
  violet: { light: '#7c3fd4', dark: '#a97bf0' },
  amber: { light: '#b26a00', dark: '#e5a13c' },
  rose: { light: '#c03060', dark: '#ef7ba1' },
  graphite: { light: '#414855', dark: '#99a3b5' }
}

const ACCENTS = Object.keys(ACCENT_PREVIEW) as AccentName[]

export function AppearanceSection({ matches }: SectionProps): ReactElement {
  const t = useT()
  const appearance = useAppSelector((state) => state.settings.values.appearance)
  const theme = useAppSelector((state) =>
    resolveTheme(state.settings.values, state.settings.systemPrefersDark)
  )

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        id="appearance.theme"
        label={t('settings.appearance.theme')}
        highlighted={matches.has('appearance.theme')}
      >
        <Segmented
          value={appearance.theme}
          options={[
            { value: 'light', label: t('settings.appearance.light') },
            { value: 'dark', label: t('settings.appearance.dark') },
            { value: 'system', label: t('settings.appearance.system') }
          ]}
          onChange={(value) => void updateSettings({ appearance: { theme: value } })}
          ariaLabel={t('settings.appearance.theme')}
        />
      </SettingsRow>

      <SettingsRow
        id="appearance.accent"
        label={t('settings.appearance.accent')}
        layout="stacked"
        highlighted={matches.has('appearance.accent')}
      >
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((accent) => {
            const selected = appearance.accent === accent

            return (
              <button
                key={accent}
                type="button"
                aria-label={t(`settings.appearance.accents.${accent}`)}
                aria-pressed={selected}
                style={{ backgroundColor: ACCENT_PREVIEW[accent][theme] }}
                className={cx(
                  'size-[26px] rounded-full border-2 transition-transform',
                  'hover:scale-110 focus-visible:shadow-focus focus-visible:outline-none',
                  selected
                    ? 'border-raised shadow-[0_0_0_2px_var(--mc-accent)]'
                    : 'border-transparent shadow-[0_0_0_1px_var(--mc-border)]'
                )}
                onClick={() => void updateSettings({ appearance: { accent } })}
              />
            )
          })}
        </div>
      </SettingsRow>

      <SettingsRow
        id="appearance.palette"
        label={t('settings.appearance.palette')}
        hint={t('settings.appearance.paletteHint')}
        highlighted={matches.has('appearance.palette')}
      >
        <Select
          value={appearance.palette}
          options={PALETTES.map((name) => ({
            value: name,
            label: t(`settings.appearance.palettes.${name}`)
          }))}
          onChange={(palette) => void updateSettings({ appearance: { palette } })}
          ariaLabel={t('settings.appearance.palette')}
        />
      </SettingsRow>

      {/* Overrides sit last: they win over the theme and the palette, so the
          order on screen is the order the colours are resolved in. */}
      <SettingsRow
        id="appearance.customColors"
        label={t('settings.appearance.customColors')}
        hint={t('settings.appearance.customColorsHint')}
        layout="stacked"
        highlighted={matches.has('appearance.customColors')}
      >
        <ColorCustomizer />
      </SettingsRow>

      <SettingsRow
        id="appearance.toolbarItems"
        label={t('settings.appearance.toolbarItems')}
        hint={t('settings.appearance.toolbarItemsHint')}
        layout="stacked"
        highlighted={matches.has('appearance.toolbarItems')}
      >
        <ToolbarCustomizer />
      </SettingsRow>

      <SettingsRow
        id="appearance.density"
        label={t('settings.appearance.density')}
        highlighted={matches.has('appearance.density')}
      >
        <Segmented
          value={appearance.uiDensity}
          options={[
            { value: 'comfortable', label: t('settings.appearance.comfortable') },
            { value: 'compact', label: t('settings.appearance.compact') }
          ]}
          onChange={(value) => void updateSettings({ appearance: { uiDensity: value } })}
          ariaLabel={t('settings.appearance.density')}
        />
      </SettingsRow>

      {/* Chrome only — the editor's own font size is under Editor, so the two
          can be tuned independently. */}
      <SettingsRow
        id="appearance.uiScale"
        label={t('settings.appearance.uiScale')}
        hint={t('settings.appearance.uiScaleHint')}
        highlighted={matches.has('appearance.uiScale')}
      >
        <Slider
          value={appearance.uiScale}
          min={UI_SCALE_MIN}
          max={UI_SCALE_MAX}
          step={UI_SCALE_STEP}
          onChange={(value) =>
            void updateSettings({ appearance: { uiScale: clampUiScale(value) } })
          }
          valueLabel={`${Math.round(appearance.uiScale * 100)}%`}
          ariaLabel={t('settings.appearance.uiScale')}
        />
      </SettingsRow>

      <Divider />

      <SettingsRow id="appearance.sidebarVisible" highlighted={matches.has('appearance.sidebarVisible')}>
        <Switch
          checked={appearance.sidebarVisible}
          onChange={(value) => void updateSettings({ appearance: { sidebarVisible: value } })}
          label={t('settings.appearance.showSidebar')}
        />
      </SettingsRow>

      <SettingsRow id="appearance.toolbarVisible" highlighted={matches.has('appearance.toolbarVisible')}>
        <Switch
          checked={appearance.toolbarVisible}
          onChange={(value) => void updateSettings({ appearance: { toolbarVisible: value } })}
          label={t('settings.appearance.showToolbar')}
        />
      </SettingsRow>

      <SettingsRow
        id="appearance.statusBarVisible"
        highlighted={matches.has('appearance.statusBarVisible')}
      >
        <Switch
          checked={appearance.statusBarVisible}
          onChange={(value) => void updateSettings({ appearance: { statusBarVisible: value } })}
          label={t('settings.appearance.showStatusBar')}
        />
      </SettingsRow>

      <SettingsRow id="appearance.reduceMotion" highlighted={matches.has('appearance.reduceMotion')}>
        <Switch
          checked={appearance.reduceMotion}
          onChange={(value) => void updateSettings({ appearance: { reduceMotion: value } })}
          label={t('settings.appearance.reduceMotion')}
        />
      </SettingsRow>

      <Divider />

      {/* Both read by main at launch, before the renderer exists — so they take
          effect on the *next* start, which the hint says out loud. */}
      <SettingsRow
        id="appearance.splashScreen"
        hint={t('settings.appearance.startupHint')}
        layout="stacked"
        highlighted={matches.has('appearance.splashScreen')}
      >
        <Switch
          checked={appearance.splashScreen}
          onChange={(value) => void updateSettings({ appearance: { splashScreen: value } })}
          label={t('settings.appearance.splashScreen')}
        />
      </SettingsRow>

      <SettingsRow id="appearance.startupSound" highlighted={matches.has('appearance.startupSound')}>
        <Switch
          checked={appearance.startupSound}
          disabled={!appearance.splashScreen}
          onChange={(value) => void updateSettings({ appearance: { startupSound: value } })}
          label={t('settings.appearance.startupSound')}
        />
      </SettingsRow>
    </div>
  )
}
