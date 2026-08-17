// ── @lib ───────────────────────────────────────────────────────────────────
import { Palette, RotateCcw } from '@icons'
import { useEffect, useMemo, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { CUSTOM_ICON_PREFIX, ICON_COLORS, ICON_LIBRARY, resolveIconRule, type IconRule, type IconRuleMatch } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { resolveTheme, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Modal, ModalActions, Segmented } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { CustomSvgIcon } from './CustomSvgIcon'
import { ICON_COMPONENTS } from './icon-library'
import { useCustomIcons } from './useIconAppearance'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { IconPickerDialogProps } from './types'

/**
 * Chooses an icon and a colour for a file or folder.
 *
 * The scope control is the point of the dialog: the same gesture ("make this
 * look different") means "this one folder" some of the time and "every folder
 * called `drafts`" or "all `.md` files" the rest of the time, and asking is
 * cheaper than guessing wrong and making the user hunt for where it was set.
 */
export function IconPickerDialog({
  open,
  onClose,
  subject
}: IconPickerDialogProps): ReactElement | null {
  const t = useT()
  const rules = useAppSelector((state) => state.settings.values.icons.rules)
  const theme = useAppSelector((state) =>
    resolveTheme(state.settings.values, state.settings.systemPrefersDark)
  )
  const customIcons = useCustomIcons()

  const [scope, setScope] = useState<IconRuleMatch>('path')
  const [icon, setIcon] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)

  /* Reopening on a different entry must not show the last one's choices. */
  useEffect(() => {
    if (!open || !subject) return

    const existing = resolveIconRule(rules, subject)
    setScope(existing?.match ?? (subject.kind === 'directory' ? 'path' : 'extension'))
    setIcon(existing?.icon ?? null)
    setColor(existing?.color ?? null)
  }, [open, subject, rules])

  const scopeOptions = useMemo(() => {
    if (!subject) return []

    const options: { value: IconRuleMatch; label: string }[] = [
      { value: 'path', label: t('icons.scope.thisOne') },
      { value: 'name', label: t('icons.scope.sameName', { name: subject.name }) }
    ]

    // An extension rule is meaningless for a folder, and for a file without one.
    if (subject.kind === 'file' && subject.ext) {
      options.push({ value: 'extension', label: t('icons.scope.sameType', { ext: subject.ext }) })
    }

    return options
  }, [subject, t])

  if (!subject) return null

  const valueFor = (match: IconRuleMatch): string =>
    match === 'path' ? subject.path : match === 'name' ? subject.name : subject.ext

  const apply = async (): Promise<void> => {
    const value = valueFor(scope)

    // One rule per (match, value, target): editing replaces rather than stacks,
    // so repeatedly recolouring a folder cannot leave a pile of dead rules.
    const target = subject.kind
    const kept = rules.filter(
      (rule) =>
        !(
          rule.match === scope &&
          rule.value.toLowerCase() === value.toLowerCase() &&
          rule.target === target
        )
    )

    const next: IconRule[] =
      icon === null && color === null
        ? kept
        : [...kept, { id: `${scope}:${value}:${target}`, match: scope, value, target, icon, color }]

    await updateSettings({ icons: { rules: next } })
    onClose()
  }

  const clear = async (): Promise<void> => {
    // Clears every rule that could be hitting this entry, not just the one in
    // the current scope — otherwise "reset" would leave it looking unchanged.
    const next = rules.filter((rule) => resolveIconRule([rule], subject) === null)
    await updateSettings({ icons: { rules: next } })
    onClose()
  }

  const hasRule = resolveIconRule(rules, subject) !== null

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('icons.dialogTitle')}
      description={subject.name}
      icon={<Palette size={17} />}
      footer={
        <ModalActions
          aside={
            hasRule ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw size={13} />}
                onClick={() => void clear()}
              >
                {t('icons.reset')}
              </Button>
            ) : null
          }
        >
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" data-autofocus onClick={() => void apply()}>
            {t('common.apply')}
          </Button>
        </ModalActions>
      }
    >
      <section className="flex flex-col gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
          {t('icons.applyTo')}
        </h3>
        <Segmented
          value={scope}
          options={scopeOptions}
          onChange={setScope}
          ariaLabel={t('icons.applyTo')}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
          {t('icons.colour')}
        </h3>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={t('icons.defaultColour')}
            aria-pressed={color === null}
            className={cx(
              'grid size-[26px] place-items-center rounded-full border-2 text-2xs text-ink-tertiary',
              'hover:scale-110 focus-visible:shadow-focus focus-visible:outline-none',
              color === null
                ? 'border-raised shadow-[0_0_0_2px_var(--mc-accent)]'
                : 'border-transparent shadow-[0_0_0_1px_var(--mc-border)]'
            )}
            onClick={() => setColor(null)}
          >
            —
          </button>

          {Object.keys(ICON_COLORS).map((name) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              aria-pressed={color === name}
              style={{ backgroundColor: ICON_COLORS[name]?.[theme] }}
              className={cx(
                'size-[26px] rounded-full border-2 transition-transform',
                'hover:scale-110 focus-visible:shadow-focus focus-visible:outline-none',
                color === name
                  ? 'border-raised shadow-[0_0_0_2px_var(--mc-accent)]'
                  : 'border-transparent shadow-[0_0_0_1px_var(--mc-border)]'
              )}
              onClick={() => setColor(name)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
          {t('icons.icon')}
        </h3>

        <div className="grid max-h-[220px] grid-cols-[repeat(auto-fill,minmax(38px,1fr))] gap-1 overflow-y-auto rounded-lg border border-line-subtle p-2">
          <IconCell
            selected={icon === null}
            label={t('icons.defaultIcon')}
            onClick={() => setIcon(null)}
          >
            <span className="text-2xs text-ink-tertiary">—</span>
          </IconCell>

          {ICON_LIBRARY.map((name) => {
            const Glyph = ICON_COMPONENTS[name]
            return (
              <IconCell
                key={name}
                selected={icon === name}
                label={name}
                onClick={() => setIcon(name)}
              >
                <Glyph
                  size={17}
                  style={color ? { color: ICON_COLORS[color]?.[theme] } : undefined}
                />
              </IconCell>
            )
          })}

          {customIcons.map((custom) => {
            const value = `${CUSTOM_ICON_PREFIX}${custom.id}`
            return (
              <IconCell
                key={value}
                selected={icon === value}
                label={custom.name}
                onClick={() => setIcon(value)}
              >
                <CustomSvgIcon
                  source={custom.source}
                  size={17}
                  color={color ? ICON_COLORS[color]?.[theme] : undefined}
                />
              </IconCell>
            )
          })}
        </div>

        <p className="text-2xs text-ink-tertiary">{t('icons.importHint')}</p>
      </section>
    </Modal>
  )
}

function IconCell({
  selected,
  label,
  onClick,
  children
}: {
  selected: boolean
  label: string
  onClick: () => void
  children: ReactElement
}): ReactElement {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={cx(
        'grid aspect-square place-items-center rounded-md border transition-colors',
        'focus-visible:shadow-focus focus-visible:outline-none',
        selected
          ? 'border-accent bg-accent-subtle text-accent'
          : 'border-transparent text-ink-secondary hover:bg-hover hover:text-ink'
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
