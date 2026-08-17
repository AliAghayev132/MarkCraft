// ── @lib ───────────────────────────────────────────────────────────────────
import { FileCode2, Braces, FileText, Image, FileType2, Upload } from '@icons'
import { useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { DEFAULT_EXPORT_OPTIONS, type ExportFormat, type ExportOptions } from '@shared'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Checkbox, Field, Modal, ModalActions, Segmented, Select } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { exportDocument } from './output-actions'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { ExportModalProps } from './types'

const FORMATS: {
  id: ExportFormat
  label: string
  description: string
  icon: React.ReactElement
}[] = [
  {
    id: 'md',
    label: 'Markdown',
    description: 'The document exactly as written, in its canonical form.',
    icon: <FileType2 size={16} />
  },
  {
    id: 'txt',
    label: 'Plain text',
    description: 'The prose with the Markdown syntax stripped out.',
    icon: <FileType2 size={16} />
  },
  {
    id: 'rtf',
    label: 'Rich text',
    description: 'Formatted text for a word processor, with headings and lists kept.',
    icon: <FileType2 size={16} />
  },
  {
    id: 'docx',
    label: 'Word',
    description: 'A .docx for Word, Pages or Google Docs, with the structure kept.',
    icon: <FileType2 size={16} />
  },
  {
    id: 'html',
    label: 'HTML',
    description: 'A single self-contained page with styles and images embedded.',
    icon: <FileCode2 size={16} />
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: 'Paginated for print, with page breaks respected.',
    icon: <FileText size={16} />
  },
  {
    id: 'png',
    label: 'PNG',
    description: 'The whole document as one tall image, ready to paste anywhere.',
    icon: <Image size={16} />
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Structured data — metadata, outline, counts and the parsed tree.',
    icon: <Braces size={16} />
  }
]

/**
 * Export (§23). The format list is data-driven so adding a format later means
 * one entry here and one handler in the main process.
 */
export function ExportModal({
  open,
  onClose,
  documentTitle
}: ExportModalProps): React.ReactElement {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS)
  const [busy, setBusy] = useState(false)

  const update = (patch: Partial<ExportOptions>): void =>
    setOptions((current) => ({ ...current, ...patch }))

  const submit = async (): Promise<void> => {
    setBusy(true)
    await exportDocument(format, options)
    setBusy(false)
    onClose()
  }

  const isPaged = format === 'pdf'
  const isRendered = format !== 'md' && format !== 'json'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export document"
      description={documentTitle}
      icon={<Upload size={17} />}
      size="md"
      footer={
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} data-autofocus onClick={() => void submit()}>
            Export as {format.toUpperCase()}
          </Button>
        </ModalActions>
      }
    >
      <Field label="Format">
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
          {FORMATS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={cx('group flex flex-col items-start gap-1 rounded-lg border bg-surface p-3 text-left transition-all hover:border-line-strong hover:bg-hover focus-visible:shadow-focus focus-visible:outline-none', format === entry.id ? 'border-accent bg-selected-muted' : 'border-line')}
              aria-pressed={format === entry.id}
              onClick={() => setFormat(entry.id)}
            >
              <span className="grid size-[30px] place-items-center rounded-md bg-active text-ink-secondary group-aria-pressed:bg-accent-subtle group-aria-pressed:text-accent">{entry.icon}</span>
              <span className="text-base font-medium text-ink">{entry.label}</span>
              <span className="text-2xs leading-normal text-ink-tertiary">{entry.description}</span>
            </button>
          ))}
        </div>
      </Field>

      {isRendered ? (
        <>
          <Field label="Appearance" layout="inline">
            <Segmented
              value={options.theme}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' }
              ]}
              onChange={(value) => update({ theme: value })}
              ariaLabel="Export theme"
            />
          </Field>

          <Checkbox
            checked={options.embedImages}
            onChange={(value) => update({ embedImages: value })}
            label="Embed images"
            description="Produces one self-contained file. Turn off to keep relative image links."
          />

          <Checkbox
            checked={options.includeStyles}
            onChange={(value) => update({ includeStyles: value })}
            label="Include styles"
            description="Without styles the output is plain, unformatted HTML."
          />
        </>
      ) : null}

      {isPaged ? (
        <>
          <Field label="Page size" layout="inline">
            <Select
              value={options.pageSize}
              options={[
                { value: 'A4', label: 'A4' },
                { value: 'Letter', label: 'Letter' },
                { value: 'Legal', label: 'Legal' },
                { value: 'A3', label: 'A3' }
              ]}
              onChange={(value) => update({ pageSize: value })}
              ariaLabel="Page size"
            />
          </Field>

          <Field label="Margins" layout="inline">
            <Select
              value={options.margins}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'minimum', label: 'Minimum' },
                { value: 'none', label: 'None' }
              ]}
              onChange={(value) => update({ margins: value })}
              ariaLabel="Page margins"
            />
          </Field>

          <Checkbox
            checked={options.landscape}
            onChange={(value) => update({ landscape: value })}
            label="Landscape orientation"
          />

          <Checkbox
            checked={options.headerFooter}
            onChange={(value) => update({ headerFooter: value })}
            label="Add header and page numbers"
          />

          <Checkbox
            checked={options.printBackground}
            onChange={(value) => update({ printBackground: value })}
            label="Print background colours"
            description="Needed for code blocks and table shading to appear."
          />
        </>
      ) : null}
    </Modal>
  )
}
