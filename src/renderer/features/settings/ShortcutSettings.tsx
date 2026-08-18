// ── @lib ───────────────────────────────────────────────────────────────────
import { AlertTriangle, RotateCcw, X } from '@icons'
import { useMemo, useState, type KeyboardEvent, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, IconButton, Kbd, SearchInput } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { buildCommandDefinitions, type CommandContext, findConflicts, formatAccelerator, localizeCommand, resolveShortcuts } from '@features/commands'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────

/** The registry is only *inspected* here, so the callbacks are inert. */
const INERT_CONTEXT: CommandContext = {
  openCommandPalette: noop,
  openSettings: noop,
  openShortcuts: noop,
  openExport: noop,
  openShare: noop,
  openHistory: noop,
  openEmoji: noop,
  present: noop,
  openDevTools: noop,
  openLinks: noop,
  openWebsite: noop,
  cleanDocument: noop,
  openCodeLanguage: noop,
  pasteAsMarkdown: noop,
  reviewDocument: noop,
  openBook: noop,
  openStudy: noop,
  openCanvas: noop,
  toggleLock: noop,
  openHttp: noop,
  openHelp: noop,
  openStatistics: noop,
  openTemplates: noop,
  openFind: noop,
  openGoToLine: noop,
  print: noop
}

function noop(): void {
  /* Bindings are inspected on this screen, never invoked. */
}

/**
 * Shortcut customisation.
 *
 * Rebinding writes an override keyed by command id, so a future change to a
 * default accelerator does not silently overwrite what the user chose, and
 * "reset" simply removes the override.
 */
export function ShortcutSettings(): ReactElement {
  const t = useT()
  const overrides = useAppSelector((state) => state.settings.values.keyboard.overrides)

  const [filter, setFilter] = useState('')
  const [capturing, setCapturing] = useState<string | null>(null)

  const definitions = useMemo(() => buildCommandDefinitions(INERT_CONTEXT), [])
  const commands = useMemo(
    () => definitions.map((definition) => localizeCommand(definition, t)),
    [definitions, t]
  )

  const shortcuts = useMemo(
    () => resolveShortcuts(definitions, overrides),
    [definitions, overrides]
  )
  const conflicts = useMemo(() => findConflicts(shortcuts), [shortcuts])

  const visible = useMemo(() => {
    const bindable = commands.filter(
      (command) => command.shortcut || command.id in overrides
    )
    const needle = filter.trim().toLowerCase()
    if (!needle) return bindable

    return bindable.filter(
      (command) =>
        command.title.toLowerCase().includes(needle) ||
        command.categoryLabel.toLowerCase().includes(needle) ||
        (shortcuts.get(command.id) ?? '').toLowerCase().includes(needle)
    )
  }, [commands, filter, overrides, shortcuts])

  const setOverride = (commandId: string, accelerator: string | null): void => {
    void updateSettings({ keyboard: { overrides: { ...overrides, [commandId]: accelerator } } })
  }

  const clearOverride = (commandId: string): void => {
    const next = { ...overrides }
    delete next[commandId]
    void updateSettings({ keyboard: { overrides: next } })
  }

  const onCapture = (commandId: string, event: KeyboardEvent): void => {
    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      setCapturing(null)
      return
    }

    // A modifier on its own is not a binding.
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) return

    const parts: string[] = []
    if (event.ctrlKey || event.metaKey) parts.push('mod')
    if (event.altKey) parts.push('alt')
    if (event.shiftKey) parts.push('shift')
    parts.push(event.key.toLowerCase() === ' ' ? 'space' : event.key.toLowerCase())

    setOverride(commandId, parts.join('+'))
    setCapturing(null)
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchInput
          size="sm"
          placeholder={t('settings.keyboard.filter')}
          value={filter}
          onChange={(event) => setFilter(event.currentTarget.value)}
          onClear={() => setFilter('')}
          aria-label={t('settings.keyboard.filterLabel')}
          className="min-w-0 flex-1"
        />

        <Button
          size="sm"
          icon={<RotateCcw size={13} />}
          disabled={Object.keys(overrides).length === 0}
          onClick={() => void updateSettings({ keyboard: { overrides: {} } })}
        >
          {t('settings.keyboard.resetAll')}
        </Button>
      </div>

      {conflicts.size > 0 ? (
        <p className="flex items-center gap-1.5 rounded-md bg-warning-bg px-2 py-1.5 text-xs text-warning">
          <AlertTriangle size={13} />
          {t('settings.keyboard.conflictNotice')}
        </p>
      ) : null}

      <div className="flex flex-col" role="table" aria-label={t('settings.keyboard.table')}>
        {visible.map((command) => {
          const accelerator = shortcuts.get(command.id)
          const overridden = command.id in overrides
          const hasConflict = accelerator
            ? (conflicts.get(accelerator.toLowerCase())?.length ?? 0) > 1
            : false

          return (
            <div
              key={command.id}
              role="row"
              className="group grid min-h-[30px] grid-cols-[84px_1fr_auto] items-center gap-2 rounded-sm px-1.5 py-px hover:bg-hover"
            >
              <span className="truncate text-2xs uppercase tracking-wide text-ink-tertiary">
                {command.categoryLabel}
              </span>

              <span className="truncate text-sm text-ink">{command.title}</span>

              <div className="flex items-center justify-end gap-px">
                {capturing === command.id ? (
                  <input
                    autoFocus
                    readOnly
                    className="h-control-sm w-[190px] rounded-sm border border-accent bg-surface px-1.5 text-center text-2xs text-accent outline-none"
                    value={t('settings.keyboard.pressKeys')}
                    aria-label={t('settings.keyboard.recording', { command: command.title })}
                    onKeyDown={(event) => onCapture(command.id, event)}
                    onBlur={() => setCapturing(null)}
                  />
                ) : (
                  <button
                    type="button"
                    className={cx(
                      'rounded-sm border border-transparent px-1 py-px transition-colors hover:border-line hover:bg-active',
                      'focus-visible:shadow-focus focus-visible:outline-none',
                      hasConflict && 'border-warning'
                    )}
                    onClick={() => setCapturing(command.id)}
                    aria-label={t('settings.keyboard.change', { command: command.title })}
                  >
                    {accelerator ? (
                      <Kbd keys={formatAccelerator(accelerator)} />
                    ) : (
                      <span className="px-1 text-2xs italic text-ink-tertiary">
                        {t('settings.keyboard.unassigned')}
                      </span>
                    )}
                  </button>
                )}

                <div className="flex min-w-[44px] items-center justify-end gap-px opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {accelerator ? (
                    <IconButton
                      icon={<X size={11} />}
                      label={t('settings.keyboard.unbind', { command: command.title })}
                      size="sm"
                      onClick={() => setOverride(command.id, null)}
                    />
                  ) : null}

                  {overridden ? (
                    <IconButton
                      icon={<RotateCcw size={11} />}
                      label={t('settings.keyboard.restore', { command: command.title })}
                      size="sm"
                      onClick={() => clearOverride(command.id)}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
