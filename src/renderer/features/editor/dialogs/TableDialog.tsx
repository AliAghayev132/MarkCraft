// ── @lib ───────────────────────────────────────────────────────────────────
import { AlignCenter, AlignLeft, AlignRight, Table2 } from '@icons'
import { useEffect, useMemo, useState } from '@lib/react'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Checkbox, Field, Modal, ModalActions, Segmented, Slider } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { buildMarkdownTable, insertTable } from '@features/editor'

/**
 * Insert table (§17).
 */
type Alignment = 'left' | 'center' | 'right'

export function TableDialog({ onClose }: { onClose: () => void }): React.ReactElement {
  const [rows, setRows] = useState(3)
  const [columns, setColumns] = useState(3)
  const [headerRow, setHeaderRow] = useState(true)
  const [alignments, setAlignments] = useState<Alignment[]>(['left', 'left', 'left'])

  useEffect(() => {
    setAlignments((current) => {
      const next = [...current]
      while (next.length < columns) next.push('left')
      return next.slice(0, columns)
    })
  }, [columns])

  const preview = useMemo(
    () => buildMarkdownTable({ rows, columns, headerRow, alignments }),
    [rows, columns, headerRow, alignments]
  )

  const submit = (): void => {
    insertTable({ rows, columns, headerRow, alignments })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Insert table"
      icon={<Table2 size={17} />}
      size="md"
      footer={
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            Insert
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Columns" layout="inline">
          <Slider
            value={columns}
            min={1}
            max={8}
            onChange={setColumns}
            ariaLabel="Number of columns"
            valueLabel={String(columns)}
          />
        </Field>

        <Field label="Body rows" layout="inline">
          <Slider
            value={rows}
            min={1}
            max={20}
            onChange={setRows}
            ariaLabel="Number of body rows"
            valueLabel={String(rows)}
          />
        </Field>
      </div>

      <Checkbox
        checked={headerRow}
        onChange={setHeaderRow}
        label="Include a header row"
        description="GitHub-Flavored Markdown tables always render their first row as a header."
      />

      <Field label="Column alignment">
        <div className="flex flex-wrap gap-2">
          {alignments.map((alignment, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <span className="min-w-[10px] text-2xs tabular-nums text-ink-tertiary">{index + 1}</span>
              <Segmented
                size="sm"
                value={alignment}
                ariaLabel={`Alignment for column ${index + 1}`}
                options={[
                  { value: 'left', icon: <AlignLeft size={12} />, ariaLabel: 'Left' },
                  { value: 'center', icon: <AlignCenter size={12} />, ariaLabel: 'Center' },
                  { value: 'right', icon: <AlignRight size={12} />, ariaLabel: 'Right' }
                ]}
                onChange={(value) =>
                  setAlignments((current) =>
                    current.map((entry, position) => (position === index ? value : entry))
                  )
                }
              />
            </div>
          ))}
        </div>
      </Field>

      <Field label="Preview">
        <pre className="mc-selectable m-0 max-h-40 overflow-auto rounded-md border border-line-subtle bg-inset p-2 text-2xs leading-relaxed whitespace-pre text-ink-secondary">{preview}</pre>
      </Field>
    </Modal>
  )
}
