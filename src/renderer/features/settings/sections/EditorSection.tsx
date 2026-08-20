// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { EDITOR_FONT_PRESETS } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Divider, Select, Slider, Switch } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { SettingsRow } from '@features/settings'

// ── types ──────────────────────────────────────────────────────────────────
import type { SectionProps } from './types'

export function EditorSection({ matches }: SectionProps): ReactElement {
  const t = useT()
  const editor = useAppSelector((state) => state.settings.values.editor)
  const writing = useAppSelector((state) => state.settings.values.writing)

  const toggles = [
    ['editor.insertSpaces', 'insertSpaces', 'settings.editor.insertSpaces'],
    ['editor.wordWrap', 'wordWrap', 'settings.editor.wordWrap'],
    ['editor.lineNumbers', 'lineNumbers', 'settings.editor.lineNumbers'],
    ['editor.highlightActiveLine', 'highlightActiveLine', 'settings.editor.highlightActiveLine'],
    ['editor.bracketMatching', 'bracketMatching', 'settings.editor.bracketMatching'],
    ['editor.autoIndent', 'autoIndent', 'settings.editor.autoIndent'],
    ['editor.spellCheck', 'spellCheck', 'settings.editor.spellCheck']
  ] as const

  /* The settings file can be hand-edited, and an older install may hold a font
     stack that predates the preset list — so an unrecognised value is offered
     back as its own option rather than leaving the picker looking unset. */
  const fontOptions = EDITOR_FONT_PRESETS.map((preset) => ({
    value: preset.value as string,
    label: preset.label as string
  }))

  if (!fontOptions.some((option) => option.value === editor.fontFamily)) {
    fontOptions.push({
      value: editor.fontFamily,
      label: t('settings.editor.customFont')
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        id="writing.focusMode"
        label={t('settings.writing.focusMode')}
        hint={t('settings.writing.focusModeHint')}
        highlighted={matches.has('writing.focusMode')}
      >
        <Switch
          checked={writing.focusMode}
          onChange={(checked) => void updateSettings({ writing: { focusMode: checked } })}
          ariaLabel={t('settings.writing.focusMode')}
        />
      </SettingsRow>

      <SettingsRow
        id="writing.dailyGoal"
        label={t('settings.writing.dailyGoal')}
        hint={t('settings.writing.dailyGoalHint')}
        highlighted={matches.has('writing.dailyGoal')}
      >
        <Slider
          value={writing.dailyGoal}
          min={0}
          max={3000}
          step={100}
          onChange={(value) => void updateSettings({ writing: { dailyGoal: value } })}
          valueLabel={
            writing.dailyGoal === 0
              ? t('settings.writing.noGoal')
              : t('common.words', { count: writing.dailyGoal })
          }
          ariaLabel={t('settings.writing.dailyGoal')}
        />
      </SettingsRow>

      <Divider />

      <SettingsRow
        id="editor.fontFamily"
        label={t('settings.editor.fontFamily')}
        highlighted={matches.has('editor.fontFamily')}
      >
        <Select
          value={editor.fontFamily}
          options={fontOptions}
          onChange={(value) => void updateSettings({ editor: { fontFamily: value } })}
          ariaLabel={t('settings.editor.fontFamily')}
        />
      </SettingsRow>

      <SettingsRow
        id="editor.fontSize"
        label={t('settings.editor.fontSize')}
        highlighted={matches.has('editor.fontSize')}
      >
        <Slider
          value={editor.fontSize}
          min={10}
          max={26}
          onChange={(value) => void updateSettings({ editor: { fontSize: value } })}
          valueLabel={`${editor.fontSize} px`}
          ariaLabel={t('settings.editor.fontSize')}
        />
      </SettingsRow>

      <SettingsRow
        id="editor.lineHeight"
        label={t('settings.editor.lineHeight')}
        highlighted={matches.has('editor.lineHeight')}
      >
        <Slider
          value={editor.lineHeight}
          min={1.2}
          max={2.4}
          step={0.1}
          onChange={(value) => void updateSettings({ editor: { lineHeight: value } })}
          valueLabel={editor.lineHeight.toFixed(1)}
          ariaLabel={t('settings.editor.lineHeight')}
        />
      </SettingsRow>

      <SettingsRow
        id="editor.tabSize"
        label={t('settings.editor.tabSize')}
        highlighted={matches.has('editor.tabSize')}
      >
        <Slider
          value={editor.tabSize}
          min={1}
          max={8}
          onChange={(value) => void updateSettings({ editor: { tabSize: value } })}
          valueLabel={String(editor.tabSize)}
          ariaLabel={t('settings.editor.tabSize')}
        />
      </SettingsRow>

      <Divider />

      {toggles.map(([id, key, labelKey]) => (
        <SettingsRow key={id} id={id} highlighted={matches.has(id)}>
          <Switch
            checked={editor[key]}
            onChange={(value) => void updateSettings({ editor: { [key]: value } })}
            label={t(labelKey)}
          />
        </SettingsRow>
      ))}
    </div>
  )
}
