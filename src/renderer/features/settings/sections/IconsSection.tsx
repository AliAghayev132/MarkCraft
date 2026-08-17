// ── @lib ───────────────────────────────────────────────────────────────────
import { FolderOpen, RefreshCw, Trash2, Upload } from '@icons'
import { useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { basename } from '@shared'
import {
  ICON_COLORS,
  customIconId,
  isCustomIcon,
  type IconRule,
  type IconSubject
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { iconsService, toast, updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { resolveTheme, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Badge, Button, Divider, EmptyState, IconButton, Input, Segmented, dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { CustomSvgIcon, ICON_COMPONENTS, openIconPicker, reloadCustomIcons, setCustomIcons, useCustomIcons } from '@features/icons'
import { SettingsRow } from '@features/settings'

// ── types ──────────────────────────────────────────────────────────────────
import type { SectionProps } from './types'

/**
 * Icon and colour rules, plus the imported SVG library.
 *
 * The right-click menu is the fast path for one folder; this is where the whole
 * set is visible at once — which matters because rules are the kind of setting
 * users forget they made, and an invisible rule looks like a bug.
 */
export function IconsSection({ matches }: SectionProps): ReactElement {
  const t = useT()
  const rules = useAppSelector((state) => state.settings.values.icons.rules)
  const theme = useAppSelector((state) =>
    resolveTheme(state.settings.values, state.settings.systemPrefersDark)
  )
  const customIcons = useCustomIcons()

  const [draftKind, setDraftKind] = useState<'extension' | 'name'>('extension')
  const [draftValue, setDraftValue] = useState('')

  const removeRule = async (id: string): Promise<void> => {
    await updateSettings({ icons: { rules: rules.filter((rule) => rule.id !== id) } })
  }

  /* A new rule opens the picker rather than being created blank: a rule with
     no icon and no colour does nothing, and would look broken in the list. */
  const startRule = (): void => {
    const value = draftValue.trim().replace(/^[.*]+/, '')
    if (!value) return

    const subject: IconSubject =
      draftKind === 'extension'
        ? { kind: 'file', name: `example.${value}`, path: `example.${value}`, ext: value.toLowerCase() }
        : { kind: 'directory', name: value, path: value, ext: '' }

    openIconPicker({
      name: subject.name,
      path: subject.path,
      kind: subject.kind,
      ext: subject.ext,
      size: 0,
      modifiedAt: 0,
      isSymlink: false,
      hasChildren: false
    })

    setDraftValue('')
  }

  const importIcons = async (): Promise<void> => {
    const before = customIcons.length
    const icons = await iconsService.import()
    setCustomIcons(icons)

    const added = icons.length - before
    if (added > 0) toast.success(t('icons.imported', { count: added }))
  }

  const removeIcon = async (id: string): Promise<void> => {
    const used = rules.some((rule) => isCustomIcon(rule.icon) && customIconId(rule.icon!) === id)

    const confirmed = await dialogs.confirm({
      title: t('icons.removeIconTitle', { name: id }),
      message: used ? t('icons.removeIconInUse') : t('icons.removeIconBody'),
      confirmLabel: t('common.delete'),
      tone: 'danger'
    })
    if (!confirmed) return

    setCustomIcons(await iconsService.remove(id))
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-[64ch] text-xs leading-relaxed text-ink-tertiary">
        {t('icons.description')}
      </p>

      <SettingsRow
        id="icons.rules"
        label={t('icons.rulesTitle')}
        layout="stacked"
        highlighted={matches.has('icons.rules')}
      >
        {rules.length === 0 ? (
          <EmptyState title={t('icons.noRules')} description={t('icons.noRulesHint')} />
        ) : (
          <ul className="flex flex-col gap-px">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hover"
              >
                <RulePreview rule={rule} theme={theme} />

                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {describe(rule)}
                </span>

                <Badge tone="neutral">{t(`icons.match.${rule.match}`)}</Badge>

                <IconButton
                  icon={<Trash2 size={13} />}
                  label={t('common.delete')}
                  size="sm"
                  onClick={() => void removeRule(rule.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsRow>

      <SettingsRow
        id="icons.addRule"
        label={t('icons.addRule')}
        hint={t('icons.addRuleHint')}
        layout="stacked"
        highlighted={matches.has('icons.addRule')}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={draftKind}
            options={[
              { value: 'extension', label: t('icons.match.extension') },
              { value: 'name', label: t('icons.match.name') }
            ]}
            onChange={setDraftKind}
            ariaLabel={t('icons.addRule')}
          />

          <Input
            size="sm"
            value={draftValue}
            placeholder={draftKind === 'extension' ? 'md' : 'drafts'}
            monospace
            className="w-[140px]"
            onChange={(event) => setDraftValue(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') startRule()
            }}
            aria-label={t('icons.addRule')}
          />

          <Button size="sm" disabled={draftValue.trim().length === 0} onClick={startRule}>
            {t('icons.choose')}
          </Button>
        </div>
      </SettingsRow>

      <Divider />

      <SettingsRow
        id="icons.custom"
        label={t('icons.customTitle')}
        hint={t('icons.customHint')}
        layout="stacked"
        highlighted={matches.has('icons.custom')}
      >
        <div className="flex flex-col gap-2">
          {customIcons.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {customIcons.map((icon) => (
                <li
                  key={icon.id}
                  className="group/icon flex items-center gap-1.5 rounded-md border border-line-subtle px-2 py-1"
                >
                  <CustomSvgIcon source={icon.source} size={16} className="text-ink-secondary" />
                  <span className="max-w-[140px] truncate text-xs text-ink-secondary">
                    {icon.name}
                  </span>
                  <IconButton
                    icon={<Trash2 size={12} />}
                    label={t('common.delete')}
                    size="sm"
                    className="opacity-0 transition-opacity group-hover/icon:opacity-100 focus-visible:opacity-100"
                    onClick={() => void removeIcon(icon.id)}
                  />
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Upload size={13} />} onClick={() => void importIcons()}>
              {t('icons.import')}
            </Button>
            <Button
              size="sm"
              icon={<FolderOpen size={13} />}
              onClick={() => void iconsService.revealFolder()}
            >
              {t('icons.openFolder')}
            </Button>
            <Button
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={() =>
                void reloadCustomIcons().then(() => toast.success(t('icons.reloaded')))
              }
            >
              {t('icons.reload')}
            </Button>
          </div>
        </div>
      </SettingsRow>
    </div>
  )
}

/** The rule's own icon and colour, so the list is scannable rather than textual. */
function RulePreview({ rule, theme }: { rule: IconRule; theme: 'light' | 'dark' }): ReactElement {
  const customIcons = useCustomIcons()
  const color = rule.color ? ICON_COLORS[rule.color]?.[theme] : undefined

  if (isCustomIcon(rule.icon)) {
    const found = customIcons.find((icon) => icon.id === customIconId(rule.icon as string))
    if (found) {
      return <CustomSvgIcon source={found.source} size={15} color={color} className="flex-none" />
    }
  }

  const Glyph = rule.icon ? ICON_COMPONENTS[rule.icon as keyof typeof ICON_COMPONENTS] : undefined
  if (Glyph) return <Glyph size={15} style={{ color }} className="flex-none" />

  return (
    <span
      className="size-[15px] flex-none rounded-full"
      style={{ backgroundColor: color ?? 'var(--mc-border)' }}
    />
  )
}

function describe(rule: IconRule): string {
  switch (rule.match) {
    case 'extension':
      return `*.${rule.value}`
    case 'name':
      return rule.value
    case 'path':
      return basename(rule.value) || rule.value
  }
}
