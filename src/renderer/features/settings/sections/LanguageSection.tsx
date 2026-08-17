// ── @lib ───────────────────────────────────────────────────────────────────
import { FolderOpen, Languages, RefreshCw, Upload } from '@icons'
import type { ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { FALLBACK_LANGUAGE, TEMPLATE_CODE, getLocale, referenceMessages, useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { localeService, reloadCustomLocales, toast, updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectAvailableLocales, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Badge, Button, Divider, Select } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { SettingsRow } from '@features/settings'

// ── types ──────────────────────────────────────────────────────────────────
import type { SectionProps } from './types'

/**
 * Interface language, plus the workflow for adding one.
 *
 * A translation is just a JSON file, and any key it omits falls back to
 * English — so contributing a language needs no toolchain and a half-finished
 * one is still usable.
 */
export function LanguageSection({ matches }: SectionProps): ReactElement {
  const t = useT()
  const preference = useAppSelector((state) => state.settings.values.language.preference)
  const locales = useAppSelector(selectAvailableLocales)

  const options = [
    { value: 'system', label: t('settings.language.systemDefault') },
    ...locales.map((locale) => ({
      value: locale.code,
      label: locale.nativeName,
      description:
        locale.coverage < 0.999
          ? t('settings.language.coverage', { percent: Math.round(locale.coverage * 100) })
          : undefined
    }))
  ]

  /*
   * The file is named after the code inside it, because that is the rule the
   * loader enforces and the one the folder README states. Asking for
   * "template.json" was neither, and main rejected it outright.
   */
  const exportTemplate = async (): Promise<void> => {
    // Seed from English so a translator edits real strings rather than a
    // skeleton of empty keys.
    const template = {
      $meta: {
        code: TEMPLATE_CODE,
        name: 'My language',
        nativeName: 'My language',
        direction: 'ltr'
      },
      ...(getLocale(FALLBACK_LANGUAGE)?.messages ?? referenceMessages)
    }

    try {
      const result = await localeService.writeTemplate(
        TEMPLATE_CODE,
        JSON.stringify(template, null, 2)
      )
      toast.success(t('settings.language.templateSaved'), result.path)
    } catch (error) {
      toast.error(
        t('settings.language.exportTemplate'),
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        id="language.preference"
        label={t('settings.language.interfaceLanguage')}
        hint={t('settings.language.interfaceHint')}
        layout="stacked"
        highlighted={matches.has('language.preference')}
      >
        <Select
          value={preference}
          options={options}
          onChange={(value) => void updateSettings({ language: { preference: value } })}
          ariaLabel={t('settings.language.interfaceLanguage')}
        />
      </SettingsRow>

      <Divider />

      <div className="flex flex-col gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
          {t('settings.language.installed')}
        </h3>

        <ul className="flex flex-col gap-px">
          {locales.map((locale) => (
            <li
              key={locale.code}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hover"
            >
              <Languages size={14} className="flex-none text-ink-tertiary" />

              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {locale.nativeName}
                <span className="ml-1.5 text-2xs text-ink-tertiary">{locale.code}</span>
              </span>

              {locale.coverage < 0.999 ? (
                <Badge tone="warning">
                  {t('settings.language.coverage', {
                    percent: Math.round(locale.coverage * 100)
                  })}
                </Badge>
              ) : null}

              <Badge tone={locale.source === 'custom' ? 'accent' : 'neutral'}>
                {t(locale.source === 'custom' ? 'settings.language.custom' : 'settings.language.builtIn')}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      <SettingsRow
        id="language.custom"
        label={t('settings.language.addTitle')}
        hint={t('settings.language.addDescription')}
        layout="stacked"
        highlighted={matches.has('language.custom')}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            icon={<FolderOpen size={13} />}
            onClick={() => void localeService.revealFolder()}
          >
            {t('settings.language.openFolder')}
          </Button>

          <Button size="sm" icon={<Upload size={13} />} onClick={() => void exportTemplate()}>
            {t('settings.language.exportTemplate')}
          </Button>

          <Button
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={() =>
              void reloadCustomLocales().then(() => toast.success(t('settings.language.reloaded')))
            }
          >
            {t('settings.language.reload')}
          </Button>
        </div>
      </SettingsRow>
    </div>
  )
}
