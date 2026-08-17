// ── @lib ───────────────────────────────────────────────────────────────────
import { AlertTriangle, Info, OctagonAlert } from '@icons'
import { useEffect, useState, type ReactElement, type ReactNode } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { validateFileName } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t as translate } from '@i18n/active'
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button } from '@ui/Button'
import { Field, Input } from '@ui/Form'
import { Modal, ModalActions } from '@ui/Modal'

// ── @utils ─────────────────────────────────────────────────────────────────
import { createExternalStore, useExternalStore } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { ChoiceOption, DialogTone } from '@ui/types'

interface BaseRequest {
  id: string
  title: string
  message?: ReactNode
  tone: DialogTone
}

interface ConfirmRequest extends BaseRequest {
  kind: 'confirm'
  confirmLabel: string
  cancelLabel: string
  resolve: (value: boolean) => void
}

interface AlertRequest extends BaseRequest {
  kind: 'alert'
  confirmLabel: string
  detail?: string
  resolve: () => void
}

interface PromptRequest extends BaseRequest {
  kind: 'prompt'
  label: string
  initialValue: string
  placeholder: string
  confirmLabel: string
  /** Return an error string to block submission, or null when valid. */
  validate?: (value: string) => string | null
  /** Preselect only the filename stem, the way editors do on rename. */
  selectStem: boolean
  resolve: (value: string | null) => void
}

interface ChoiceRequest extends BaseRequest {
  kind: 'choice'
  options: ChoiceOption<string>[]
  resolve: (value: string | null) => void
}

type DialogRequest = ConfirmRequest | AlertRequest | PromptRequest | ChoiceRequest

const queueStore = createExternalStore<DialogRequest[]>([])

function enqueue<T>(build: (id: string, resolve: (value: T) => void) => DialogRequest): Promise<T> {
  return new Promise<T>((resolve) => {
    const id = crypto.randomUUID()
    queueStore.set([...queueStore.get(), build(id, resolve)])
  })
}

function shift(): void {
  queueStore.set(queueStore.get().slice(1))
}

export const dialogs = {
  confirm(options: {
    title: string
    message?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    tone?: DialogTone
  }): Promise<boolean> {
    return enqueue<boolean>((id, resolve) => ({
      kind: 'confirm',
      id,
      title: options.title,
      message: options.message,
      tone: options.tone ?? 'default',
      confirmLabel: options.confirmLabel ?? translate('common.confirm'),
      cancelLabel: options.cancelLabel ?? translate('common.cancel'),
      resolve
    }))
  },

  alert(options: {
    title: string
    message?: ReactNode
    detail?: string
    confirmLabel?: string
    tone?: DialogTone
  }): Promise<void> {
    return enqueue<void>((id, resolve) => ({
      kind: 'alert',
      id,
      title: options.title,
      message: options.message,
      detail: options.detail,
      tone: options.tone ?? 'info',
      confirmLabel: options.confirmLabel ?? 'OK',
      resolve
    }))
  },

  prompt(options: {
    title: string
    message?: ReactNode
    label?: string
    initialValue?: string
    placeholder?: string
    confirmLabel?: string
    validate?: (value: string) => string | null
    selectStem?: boolean
    tone?: DialogTone
  }): Promise<string | null> {
    return enqueue<string | null>((id, resolve) => ({
      kind: 'prompt',
      id,
      title: options.title,
      message: options.message,
      tone: options.tone ?? 'default',
      label: options.label ?? translate('common.name'),
      initialValue: options.initialValue ?? '',
      placeholder: options.placeholder ?? '',
      confirmLabel: options.confirmLabel ?? 'OK',
      validate: options.validate,
      selectStem: options.selectStem ?? false,
      resolve
    }))
  },

  /** Three-way (or more) decisions, e.g. Save / Don't Save / Cancel. */
  choose<T extends string>(options: {
    title: string
    message?: ReactNode
    options: ChoiceOption<T>[]
    tone?: DialogTone
  }): Promise<T | null> {
    return enqueue<string | null>((id, resolve) => ({
      kind: 'choice',
      id,
      title: options.title,
      message: options.message,
      tone: options.tone ?? 'warning',
      options: options.options as ChoiceOption<string>[],
      resolve
    })) as Promise<T | null>
  },

  /* ── Named flows, so the copy for a decision lives in one place ─────────── */

  confirmDelete(options: { names: string[]; toTrash: boolean }): Promise<boolean> {
    const { names, toTrash } = options
    const target =
      names.length === 1
        ? `"${names[0]}"`
        : translate('common.items', { count: names.length })

    return dialogs.confirm({
      title: translate('dialogs.deleteTitle', { target }),
      message: translate(toTrash ? 'dialogs.deleteTrash' : 'dialogs.deletePermanent'),
      confirmLabel: translate(toTrash ? 'dialogs.moveToTrash' : 'dialogs.deleteForever'),
      cancelLabel: translate('common.cancel'),
      tone: 'danger'
    })
  },

  unsavedChanges(options: { name: string; count?: number }): Promise<'save' | 'discard' | null> {
    const { name, count = 1 } = options

    return dialogs.choose<'save' | 'discard'>({
      title: translate('dialogs.unsavedTitle'),
      message:
        count > 1
          ? translate('dialogs.unsavedMultiple', { count })
          : translate('dialogs.unsavedSingle', { name }),
      tone: 'warning',
      options: [
        {
          id: 'save',
          label: count > 1 ? translate('dialogs.saveAll') : translate('common.save'),
          variant: 'primary',
          autoFocus: true
        },
        { id: 'discard', label: translate('dialogs.dontSave'), variant: 'dangerGhost' }
      ]
    })
  },

  fileName(options: {
    title: string
    initialValue?: string
    confirmLabel?: string
    existingNames?: string[]
  }): Promise<string | null> {
    const existing = new Set((options.existingNames ?? []).map((name) => name.toLowerCase()))

    return dialogs.prompt({
      title: options.title,
      label: translate('common.name'),
      initialValue: options.initialValue ?? '',
      placeholder: 'Untitled.md',
      confirmLabel: options.confirmLabel ?? translate('common.create'),
      selectStem: true,
      validate: (value) => {
        const check = validateFileName(value)
        if (!check.valid) return check.reason ?? 'Invalid name.'

        const normalized = value.trim().toLowerCase()
        if (normalized !== options.initialValue?.trim().toLowerCase() && existing.has(normalized)) {
          return translate('dialogs.nameExists')
        }
        return null
      }
    })
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * The layer. Mounted once near the root; renders the head of the queue.
 * ─────────────────────────────────────────────────────────────────────────── */

const TONE_ICON: Record<DialogTone, ReactNode> = {
  default: null,
  danger: <OctagonAlert size={17} />,
  warning: <AlertTriangle size={17} />,
  info: <Info size={17} />
}

export function DialogLayer(): ReactElement | null {
  const queue = useExternalStore(queueStore)
  const t = useT()
  const request = queue[0]

  if (!request) return null

  const close = (settle: () => void): void => {
    settle()
    shift()
  }

  const icon = TONE_ICON[request.tone]
  const shell = {
    open: true,
    title: request.title,
    icon,
    iconTone: request.tone === 'default' ? ('accent' as const) : (request.tone as 'danger' | 'warning' | 'info'),
    size: 'sm' as const
  }

  switch (request.kind) {
    case 'confirm':
      return (
        <Modal
          {...shell}
          description={request.message}
          onClose={() => close(() => request.resolve(false))}
          footer={
            <ModalActions>
              <Button onClick={() => close(() => request.resolve(false))}>
                {request.cancelLabel}
              </Button>
              <Button
                variant={request.tone === 'danger' ? 'danger' : 'primary'}
                data-autofocus
                onClick={() => close(() => request.resolve(true))}
              >
                {request.confirmLabel}
              </Button>
            </ModalActions>
          }
        />
      )

    case 'alert':
      return (
        <Modal
          {...shell}
          description={request.message}
          onClose={() => close(() => request.resolve())}
          footer={
            <ModalActions>
              <Button variant="primary" data-autofocus onClick={() => close(() => request.resolve())}>
                {request.confirmLabel}
              </Button>
            </ModalActions>
          }
        >
          {request.detail ? (
            <pre className="mc-selectable max-h-40 overflow-auto rounded-md border border-line-subtle bg-inset p-2 text-xs leading-normal break-words whitespace-pre-wrap text-ink-secondary">
              {request.detail}
            </pre>
          ) : null}
        </Modal>
      )

    case 'choice':
      return (
        <Modal
          {...shell}
          description={request.message}
          closeOnBackdrop={false}
          onClose={() => close(() => request.resolve(null))}
          footer={
            <ModalActions>
              <Button onClick={() => close(() => request.resolve(null))}>{t('common.cancel')}</Button>
              {request.options.map((option) => (
                <Button
                  key={option.id}
                  variant={option.variant ?? 'secondary'}
                  {...(option.autoFocus ? { 'data-autofocus': true } : {})}
                  onClick={() => close(() => request.resolve(option.id))}
                >
                  {option.label}
                </Button>
              ))}
            </ModalActions>
          }
        />
      )

    case 'prompt':
      return <PromptDialog request={request} onSettle={(value) => close(() => request.resolve(value))} />
  }
}

function PromptDialog({
  request,
  onSettle
}: {
  request: PromptRequest
  onSettle: (value: string | null) => void
}): ReactElement {
  const t = useT()
  const [value, setValue] = useState(request.initialValue)
  const [touched, setTouched] = useState(false)
  const [input, setInput] = useState<HTMLInputElement | null>(null)

  const error = touched ? (request.validate?.(value) ?? null) : null
  const canSubmit = value.trim().length > 0 && (request.validate?.(value) ?? null) === null

  useEffect(() => {
    if (!input) return
    input.focus()
    // Selecting only the stem means Enter-to-rename keeps the extension.
    const dot = request.selectStem ? request.initialValue.lastIndexOf('.') : -1
    if (dot > 0) input.setSelectionRange(0, dot)
    else input.select()
  }, [input, request.initialValue, request.selectStem])

  const submit = (): void => {
    setTouched(true)
    if (!canSubmit) return
    onSettle(value.trim())
  }

  return (
    <Modal
      open
      title={request.title}
      description={request.message}
      size="sm"
      onClose={() => onSettle(null)}
      footer={
        <ModalActions>
          <Button onClick={() => onSettle(null)}>{t('common.cancel')}</Button>
          <Button variant="primary" disabled={!canSubmit} onClick={submit}>
            {request.confirmLabel}
          </Button>
        </ModalActions>
      }
    >
      <Field label={request.label} error={error}>
        <Input
          ref={setInput}
          value={value}
          placeholder={request.placeholder}
          invalid={Boolean(error)}
          onChange={(event) => {
            setValue(event.currentTarget.value)
            setTouched(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
        />
      </Field>
    </Modal>
  )
}
