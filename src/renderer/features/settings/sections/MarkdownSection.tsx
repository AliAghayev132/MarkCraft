// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Divider, Input, Segmented, Select, Switch } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { SettingsRow } from '@features/settings'

// ── types ──────────────────────────────────────────────────────────────────
import type { SectionProps } from './types'

export function MarkdownSection({ matches }: SectionProps): ReactElement {
  const t = useT()
  const markdown = useAppSelector((state) => state.settings.values.markdown)

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        id="markdown.defaultViewMode"
        label={t('settings.markdown.defaultView')}
        highlighted={matches.has('markdown.defaultViewMode')}
      >
        <Select
          value={markdown.defaultViewMode}
          options={[
            { value: 'rich', label: t('status.modes.rich') },
            { value: 'source', label: t('status.modes.source') },
            { value: 'split', label: t('status.modes.split') },
            { value: 'preview', label: t('status.modes.preview') }
          ]}
          onChange={(value) => void updateSettings({ markdown: { defaultViewMode: value } })}
          ariaLabel={t('settings.markdown.defaultView')}
        />
      </SettingsRow>

      <SettingsRow id="markdown.gfm" highlighted={matches.has('markdown.gfm')}>
        <Switch
          checked={markdown.gfm}
          onChange={(value) => void updateSettings({ markdown: { gfm: value } })}
          label={t('settings.markdown.gfm')}
        />
      </SettingsRow>

      <SettingsRow id="markdown.syncScroll" highlighted={matches.has('markdown.syncScroll')}>
        <Switch
          checked={markdown.syncScroll}
          onChange={(value) => void updateSettings({ markdown: { syncScroll: value } })}
          label={t('settings.markdown.syncScroll')}
        />
      </SettingsRow>

      <SettingsRow
        id="markdown.codeHighlighting"
        highlighted={matches.has('markdown.codeHighlighting')}
      >
        <Switch
          checked={markdown.codeHighlighting}
          onChange={(value) => void updateSettings({ markdown: { codeHighlighting: value } })}
          label={t('settings.markdown.codeHighlighting')}
        />
      </SettingsRow>

      <Divider />

      <p className="max-w-[60ch] text-xs leading-relaxed text-ink-tertiary">
        {t('settings.markdown.styleNote')}
      </p>

      <SettingsRow
        id="markdown.bullet"
        label={t('settings.markdown.bullet')}
        highlighted={matches.has('markdown.bullet')}
      >
        <Segmented
          value={markdown.bullet}
          options={[
            { value: '-', label: '-' },
            { value: '*', label: '*' },
            { value: '+', label: '+' }
          ]}
          onChange={(value) => void updateSettings({ markdown: { bullet: value } })}
          ariaLabel={t('settings.markdown.bullet')}
        />
      </SettingsRow>

      <SettingsRow
        id="markdown.emphasis"
        label={t('settings.markdown.emphasis')}
        highlighted={matches.has('markdown.emphasis')}
      >
        <Segmented
          value={markdown.emphasis}
          options={[
            { value: '_', label: '_italic_' },
            { value: '*', label: '*italic*' }
          ]}
          onChange={(value) => void updateSettings({ markdown: { emphasis: value } })}
          ariaLabel={t('settings.markdown.emphasis')}
        />
      </SettingsRow>

      <SettingsRow
        id="markdown.strong"
        label={t('settings.markdown.strong')}
        highlighted={matches.has('markdown.strong')}
      >
        <Segmented
          value={markdown.strong}
          options={[
            { value: '*', label: '**bold**' },
            { value: '_', label: '__bold__' }
          ]}
          onChange={(value) => void updateSettings({ markdown: { strong: value } })}
          ariaLabel={t('settings.markdown.strong')}
        />
      </SettingsRow>

      <Divider />

      <SettingsRow
        id="markdown.imageHandling"
        label={t('settings.markdown.imageHandling')}
        highlighted={matches.has('markdown.imageHandling')}
      >
        <Select
          value={markdown.imageHandling}
          options={[
            { value: 'relative', label: t('settings.markdown.imageRelative') },
            { value: 'absolute', label: t('settings.markdown.imageAbsolute') }
          ]}
          onChange={(value) => void updateSettings({ markdown: { imageHandling: value } })}
          ariaLabel={t('settings.markdown.imageHandling')}
        />
      </SettingsRow>

      <SettingsRow
        id="markdown.imageFolder"
        label={t('settings.markdown.imageFolder')}
        highlighted={matches.has('markdown.imageFolder')}
      >
        <Input
          size="sm"
          value={markdown.imageFolder}
          monospace
          onChange={(event) =>
            void updateSettings({ markdown: { imageFolder: event.currentTarget.value } })
          }
          aria-label={t('settings.markdown.imageFolderLabel')}
        />
      </SettingsRow>
    </div>
  )
}
