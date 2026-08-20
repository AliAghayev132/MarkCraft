// ── @lib ───────────────────────────────────────────────────────────────────
import {
  ChevronRight,
  FileCog,
  Info,
  Keyboard,
  Languages,
  Palette,
  Scissors,
  RotateCcw,
  Settings as SettingsIcon,
  Shapes,
  Sparkles,
  Type
} from '@icons'
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { Settings } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { resetSettings } from '@services'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Badge, Button, EmptyState, Modal, ModalActions, SearchInput, dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { SettingsGroup } from './SettingsRow'
import { ShortcutSettings } from './ShortcutSettings'
import { groupHits, searchSettings } from './settings-catalogue'
import { AboutSection, AiSection, AppearanceSection, EditorSection, FilesSection, IconsSection, LanguageSection, MarkdownSection, SnippetsSection } from './sections'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { SettingsModalProps, SettingsSectionId } from './types'

const SECTIONS: { id: SettingsSectionId; icon: ReactNode }[] = [
  { id: 'editor', icon: <Type size={15} /> },
  { id: 'appearance', icon: <Palette size={15} /> },
  { id: 'markdown', icon: <SettingsIcon size={15} /> },
  { id: 'files', icon: <FileCog size={15} /> },
  { id: 'icons', icon: <Shapes size={15} /> },
  { id: 'snippets', icon: <Scissors size={15} /> },
  { id: 'language', icon: <Languages size={15} /> },
  { id: 'keyboard', icon: <Keyboard size={15} /> },
  { id: 'ai', icon: <Sparkles size={15} /> },
  { id: 'about', icon: <Info size={15} /> }
]

/** Sections whose contents are not settings, so there is nothing to reset. */
const NOT_RESETTABLE: SettingsSectionId[] = ['keyboard', 'about']

/**
 * The settings screen.
 *
 * Every control writes through the settings actions, which apply the change
 * optimistically and persist it in the main process — so a preference takes
 * effect the instant it is toggled and survives a restart.
 *
 * Search answers "which page is this on?": it consults the catalogue rather
 * than the rendered tree, so it finds settings in sections that are not
 * mounted, and each result names its section. Choosing one opens that section
 * with the control ringed in the accent colour and scrolled into view.
 */
export function SettingsModal({ open, onClose, appInfo }: SettingsModalProps): ReactElement {
  const t = useT()
  const [section, setSection] = useState<SettingsSectionId>('editor')
  const [query, setQuery] = useState('')
  /** The setting a search result navigated to; highlighted until we move on. */
  const [focusId, setFocusId] = useState<string | null>(null)

  // A stale query would silently filter the screen the next time it opens.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setFocusId(null)
  }, [open])

  // Bring the chosen setting into view once its section has rendered.
  useEffect(() => {
    if (!focusId) return

    const element = document.querySelector(`[data-setting="${CSS.escape(focusId)}"]`)
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusId, section])

  const hits = useMemo(() => searchSettings(query, t), [query, t])
  const grouped = useMemo(() => groupHits(hits), [hits])

  const searching = query.trim().length > 0
  const highlighted = useMemo(() => new Set(focusId ? [focusId] : []), [focusId])

  const goTo = (id: string, target: SettingsSectionId): void => {
    setSection(target)
    setQuery('')
    setFocusId(id)
  }

  const resetSection = async (): Promise<void> => {
    if (NOT_RESETTABLE.includes(section)) return

    const confirmed = await dialogs.confirm({
      title: t('settings.resetSectionTitle', { section: t(`settings.nav.${section}`) }),
      message: t('settings.resetSectionBody'),
      confirmLabel: t('common.reset'),
      tone: 'danger'
    })
    if (confirmed) await resetSettings(section as keyof Settings)
  }

  const renderSection = (): ReactElement => {
    switch (section) {
      case 'editor':
        return <EditorSection matches={highlighted} />
      case 'appearance':
        return <AppearanceSection matches={highlighted} />
      case 'markdown':
        return <MarkdownSection matches={highlighted} />
      case 'files':
        return <FilesSection matches={highlighted} />
      case 'icons':
        return <IconsSection matches={highlighted} />
      case 'snippets':
        return <SnippetsSection matches={highlighted} />
      case 'language':
        return <LanguageSection matches={highlighted} />
      case 'keyboard':
        return <ShortcutSettings />
      case 'ai':
        return <AiSection matches={highlighted} />
      case 'about':
        return <AboutSection appInfo={appInfo} />
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('settings.title')}
      size="2xl"
      icon={<SettingsIcon size={17} />}
      bodyClassName="gap-0 overflow-hidden px-0 pb-0"
      footer={
        <ModalActions
          aside={
            !NOT_RESETTABLE.includes(section) && !searching ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw size={13} />}
                onClick={() => void resetSection()}
              >
                {t('settings.resetSection')}
              </Button>
            ) : null
          }
        >
          <Button variant="primary" data-autofocus onClick={onClose}>
            {t('common.done')}
          </Button>
        </ModalActions>
      }
    >
      {/* A fixed height, not a content-driven one: the screen must not resize
          as sections are switched or a search narrows the list — the panel
          would jump under the pointer. Overflow is the content's problem. */}
      <div className="ui-scaled flex h-[min(680px,72vh)]">
        <nav
          className="flex w-[200px] flex-none flex-col gap-2 overflow-y-auto border-r border-line-subtle bg-sunken px-3 py-3"
          aria-label={t('settings.sections')}
        >
          <SearchInput
            size="sm"
            placeholder={t('settings.search.placeholder')}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onClear={() => setQuery('')}
            aria-label={t('settings.search.label')}
          />

          <div className="flex flex-col gap-px">
            {SECTIONS.map((entry) => {
              const count = grouped.get(entry.id)?.length ?? 0

              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-current={!searching && section === entry.id ? 'page' : undefined}
                  className={cx(
                    'flex h-control items-center gap-2 rounded-md px-2 text-left text-sm transition-colors',
                    'focus-visible:shadow-focus focus-visible:outline-none',
                    !searching && section === entry.id
                      ? 'bg-selected font-medium text-accent'
                      : 'text-ink-secondary hover:bg-hover hover:text-ink',
                    // While searching, a section with nothing to offer is dimmed
                    // rather than hidden — the nav stays a stable map.
                    searching && count === 0 && 'opacity-40'
                  )}
                  onClick={() => {
                    setSection(entry.id)
                    setQuery('')
                    setFocusId(null)
                  }}
                >
                  <span className="flex-none">{entry.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{t(`settings.nav.${entry.id}`)}</span>
                  {searching && count > 0 ? <Badge tone="accent">{count}</Badge> : null}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto px-5 py-4">
          {searching ? (
            hits.length === 0 ? (
              <EmptyState
                title={t('settings.search.noResults', { query: query.trim() })}
                description={t('settings.search.noResultsHint')}
              />
            ) : (
              <div className="flex flex-col gap-5">
                <p className="text-xs text-ink-tertiary">
                  {t(
                    hits.length === 1
                      ? 'settings.search.matchCount'
                      : 'settings.search.matchCountPlural',
                    { count: hits.length }
                  )}
                </p>

                {SECTIONS.filter((entry) => grouped.has(entry.id)).map((entry) => (
                  <SettingsGroup key={entry.id} title={t(`settings.nav.${entry.id}`)}>
                    <div className="flex flex-col gap-1">
                      {(grouped.get(entry.id) ?? []).map((hit) => (
                        <button
                          key={hit.entry.id}
                          type="button"
                          className={cx(
                            'group flex items-center gap-3 rounded-lg border border-line-subtle bg-surface px-3 py-2 text-left',
                            'transition-colors hover:border-accent hover:bg-accent-subtle',
                            'focus-visible:shadow-focus focus-visible:outline-none'
                          )}
                          onClick={() => goTo(hit.entry.id, entry.id)}
                        >
                          <span className="flex-none text-ink-tertiary group-hover:text-accent">
                            {entry.icon}
                          </span>

                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-sm text-ink">{hit.label}</span>
                            {hit.entry.hintKey ? (
                              <span className="truncate text-xs text-ink-tertiary">
                                {t(hit.entry.hintKey)}
                              </span>
                            ) : null}
                          </span>

                          <ChevronRight
                            size={14}
                            className="flex-none text-ink-tertiary group-hover:text-accent"
                          />
                        </button>
                      ))}
                    </div>
                  </SettingsGroup>
                ))}
              </div>
            )
          ) : (
            renderSection()
          )}
        </div>
      </div>
    </Modal>
  )
}
