// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { settingsService, updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { hiddenFilesToggled, useAppDispatch, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Divider, Select, Slider, Switch } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { SettingsRow } from '@features/settings'
import { refreshDirectory } from '@features/explorer'

// ── types ──────────────────────────────────────────────────────────────────
import type { SectionProps } from './types'

export function FilesSection({ matches }: SectionProps): ReactElement {
  const t = useT()
  const dispatch = useAppDispatch()
  const files = useAppSelector((state) => state.settings.values.files)
  const root = useAppSelector((state) => state.workspace.root)

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        id="files.autoSave"
        label={t('settings.files.autoSave')}
        highlighted={matches.has('files.autoSave')}
      >
        <Select
          value={files.autoSave}
          options={[
            {
              value: 'off',
              label: t('settings.files.autoSaveOff'),
              description: t('settings.files.autoSaveOffDescription')
            },
            {
              value: 'afterDelay',
              label: t('settings.files.autoSaveDelay'),
              description: t('settings.files.autoSaveDelayDescription')
            },
            {
              value: 'onFocusChange',
              label: t('settings.files.autoSaveFocus'),
              description: t('settings.files.autoSaveFocusDescription')
            }
          ]}
          onChange={(value) => void updateSettings({ files: { autoSave: value } })}
          ariaLabel={t('settings.files.autoSave')}
        />
      </SettingsRow>

      {files.autoSave === 'afterDelay' ? (
        <SettingsRow
          id="files.autoSaveDelayMs"
          label={t('settings.files.autoSaveDelayLabel')}
          highlighted={matches.has('files.autoSaveDelayMs')}
        >
          <Slider
            value={files.autoSaveDelayMs}
            min={400}
            max={5000}
            step={200}
            onChange={(value) => void updateSettings({ files: { autoSaveDelayMs: value } })}
            valueLabel={`${(files.autoSaveDelayMs / 1000).toFixed(1)} s`}
            ariaLabel={t('settings.files.autoSaveDelayLabel')}
          />
        </SettingsRow>
      ) : null}

      <Divider />

      {/* The defining filter for a Markdown editor: a project folder is mostly
          files it cannot open, so they are hidden until asked for. */}
      <SettingsRow
        id="files.markdownOnly"
        hint={t('settings.files.markdownOnlyHint')}
        layout="stacked"
        highlighted={matches.has('files.markdownOnly')}
      >
        <Switch
          checked={files.markdownOnly}
          onChange={(value) => void updateSettings({ files: { markdownOnly: value } })}
          label={t('settings.files.markdownOnly')}
        />
      </SettingsRow>

      <SettingsRow id="files.showHiddenFiles" highlighted={matches.has('files.showHiddenFiles')}>
        <Switch
          checked={files.showHiddenFiles}
          onChange={(value) => {
            void updateSettings({ files: { showHiddenFiles: value } })
            // Hidden files are filtered when the directory is *read*, so the
            // open folders have to be re-listed for the change to show.
            dispatch(hiddenFilesToggled(value))
            if (root) void refreshDirectory(root)
          }}
          label={t('settings.files.showHidden')}
        />
      </SettingsRow>

      <Divider />

      <SettingsRow id="files.recoveryEnabled" highlighted={matches.has('files.recoveryEnabled')}>
        <Switch
          checked={files.recoveryEnabled}
          onChange={(value) => void updateSettings({ files: { recoveryEnabled: value } })}
          label={t('settings.files.recovery')}
        />
      </SettingsRow>

      <SettingsRow
        id="files.watchExternalChanges"
        highlighted={matches.has('files.watchExternalChanges')}
      >
        <Switch
          checked={files.watchExternalChanges}
          onChange={(value) => void updateSettings({ files: { watchExternalChanges: value } })}
          label={t('settings.files.watchExternal')}
        />
      </SettingsRow>

      <SettingsRow id="files.confirmDelete" highlighted={matches.has('files.confirmDelete')}>
        <Switch
          checked={files.confirmDelete}
          onChange={(value) => void updateSettings({ files: { confirmDelete: value } })}
          label={t('settings.files.confirmDelete')}
        />
      </SettingsRow>

      <Divider />

      <SettingsRow
        id="files.defaultEol"
        label={t('settings.files.lineEndings')}
        highlighted={matches.has('files.defaultEol')}
      >
        <Select
          value={files.defaultEol}
          options={[
            { value: 'auto', label: t('settings.files.eolAuto') },
            { value: 'lf', label: t('settings.files.eolLf') },
            { value: 'crlf', label: t('settings.files.eolCrlf') }
          ]}
          onChange={(value) => void updateSettings({ files: { defaultEol: value } })}
          ariaLabel={t('settings.files.lineEndings')}
        />
      </SettingsRow>

      <SettingsRow
        id="files.recentLimit"
        label={t('settings.files.recentLimit')}
        highlighted={matches.has('files.recentLimit')}
      >
        <Slider
          value={files.recentLimit}
          min={5}
          max={50}
          step={5}
          onChange={(value) => void updateSettings({ files: { recentLimit: value } })}
          valueLabel={String(files.recentLimit)}
          ariaLabel={t('settings.files.recentLimit')}
        />
      </SettingsRow>

      <SettingsRow
        id="files.trashLimit"
        label={t('settings.files.trashLimit')}
        hint={t('settings.files.trashLimitHint')}
        highlighted={matches.has('files.trashLimit')}
      >
        <Slider
          value={files.trashLimit}
          min={0}
          max={200}
          step={5}
          onChange={(value) => void updateSettings({ files: { trashLimit: value } })}
          valueLabel={
            files.trashLimit === 0 ? t('settings.files.trashUnlimited') : String(files.trashLimit)
          }
          ariaLabel={t('settings.files.trashLimit')}
        />
      </SettingsRow>

      <SettingsRow
        id="files.historyLimit"
        label={t('settings.files.historyLimit')}
        hint={t('settings.files.historyLimitHint')}
        highlighted={matches.has('files.historyLimit')}
      >
        <Slider
          value={files.historyLimit}
          min={0}
          max={200}
          step={5}
          onChange={(value) => void updateSettings({ files: { historyLimit: value } })}
          valueLabel={
            files.historyLimit === 0 ? t('settings.files.historyOff') : String(files.historyLimit)
          }
          ariaLabel={t('settings.files.historyLimit')}
        />
      </SettingsRow>



      <Button size="sm" className="self-start" onClick={() => void settingsService.revealFile()}>
        {t('settings.files.showSettingsFile')}
      </Button>
    </div>
  )
}
