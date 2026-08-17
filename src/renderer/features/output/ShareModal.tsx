// ── @lib ───────────────────────────────────────────────────────────────────
import { Clipboard, Code2, FolderOpen, Link2, Mail, Share2, Upload } from '@icons'
import { useEffect, useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { ShareTarget } from '@shared'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Input, Modal, ModalActions } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { shareDocument } from './output-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { ShareModalProps } from './types'

interface ShareOption {
  id: ShareTarget
  label: string
  description: string
  icon: React.ReactElement
  requiresPath?: boolean
  macOnly?: boolean
}

const OPTIONS: ShareOption[] = [
  {
    id: 'copy-markdown',
    label: 'Copy as Markdown',
    description: 'The raw source, ready to paste into a repository or chat.',
    icon: <Clipboard size={15} />
  },
  {
    id: 'copy-html',
    label: 'Copy as rich text',
    description: 'Formatted HTML that pastes into email and word processors.',
    icon: <Code2 size={15} />
  },
  {
    id: 'copy-path',
    label: 'Copy file path',
    description: 'The full path to this document on disk.',
    icon: <Link2 size={15} />,
    requiresPath: true
  },
  {
    id: 'reveal',
    label: 'Show in file manager',
    description: 'Open the containing folder with this file selected.',
    icon: <FolderOpen size={15} />,
    requiresPath: true
  },
  {
    id: 'email',
    label: 'Send by email',
    description: 'Opens a draft in your mail client with the .md file attached.',
    icon: <Mail size={15} />
  },
  {
    id: 'os',
    label: 'System share sheet',
    description: 'Hand the file to another application. macOS only.',
    icon: <Share2 size={15} />,
    requiresPath: true,
    macOnly: true
  }
]

/**
 * Share (§24).
 *
 * The visible UI is entirely the application's own; Electron's platform
 * integrations (clipboard, shell, macOS ShareMenu) are used behind it.
 */
export function ShareModal({
  open,
  onClose,
  documentTitle,
  hasPath,
  onExport
}: ShareModalProps): React.ReactElement {
  const isMac = navigator.platform.toLowerCase().includes('mac')

  /* The address is optional — a blank To: line simply opens an empty draft —
     but typing it here saves a step in the mail client. */
  const [recipient, setRecipient] = useState('')

  useEffect(() => {
    if (open) setRecipient('')
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share document"
      description={documentTitle}
      icon={<Share2 size={17} />}
      size="md"
      footer={
        <ModalActions>
          <Button icon={<Upload size={14} />} onClick={onExport}>
            Export instead…
          </Button>
          <Button variant="primary" data-autofocus onClick={onClose}>
            Done
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-1">
        {OPTIONS.filter((option) => !option.macOnly || isMac).map((option) => {
          const disabled = Boolean(option.requiresPath) && !hasPath

          return (
            <button
              key={option.id}
              type="button"
              className="flex items-start gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors not-disabled:hover:border-line-subtle not-disabled:hover:bg-hover disabled:opacity-50 focus-visible:shadow-focus focus-visible:outline-none"
              disabled={disabled}
              onClick={() => {
                void shareDocument(option.id, option.id === 'email' ? recipient : undefined)
                if (option.id !== 'os') onClose()
              }}
            >
              <span className="grid size-7 flex-none place-items-center rounded-md bg-active text-ink-secondary">{option.icon}</span>
              <span className="flex min-w-0 flex-col gap-px">
                <span className="text-base text-ink">{option.label}</span>
                <span className="text-xs leading-normal text-ink-tertiary">
                  {disabled ? 'Save the document first.' : option.description}
                </span>
              </span>
            </button>
          )
        })}

        {/* Sits with the option it belongs to rather than in a second step:
            filling it in is the only decision this dialog ever asks for. */}
        <label className="mt-1 flex items-center gap-2 rounded-md border border-line-subtle px-3 py-2">
          <Mail size={14} className="flex-none text-ink-tertiary" />
          <span className="flex-none text-xs text-ink-secondary">Send to</span>
          <Input
            size="sm"
            type="email"
            value={recipient}
            placeholder="name@example.com — optional"
            className="flex-1"
            onChange={(event) => setRecipient(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              void shareDocument('email', recipient)
              onClose()
            }}
            aria-label="Email recipient"
          />
        </label>
      </div>
    </Modal>
  )
}
