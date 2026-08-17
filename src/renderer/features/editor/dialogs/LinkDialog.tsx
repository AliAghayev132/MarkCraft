// ── @lib ───────────────────────────────────────────────────────────────────
import { Link2 } from '@icons'
import { useEffect, useMemo, useState } from '@lib/react'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Field, Input, Modal, ModalActions } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry, insertLink } from '@features/editor'
import { selectionOf } from '@features/editor/source'

/**
 * Insert link (§16) — a real dialog, never `window.prompt`.
 */
export function LinkDialog({ onClose }: { onClose: () => void }): React.ReactElement {
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')

  // Seed the label from the current selection, the way every editor does.
  useEffect(() => {
    const view = editorRegistry.getSourceView()
    if (editorRegistry.getSurface() === 'source' && view) {
      setText(selectionOf(view).text)
      return
    }

    const editor = editorRegistry.getRichEditor()
    if (editor) {
      const { from, to } = editor.state.selection
      setText(editor.state.doc.textBetween(from, to, ' '))
      const existing = editor.getAttributes('link')
      if (existing.href) setUrl(String(existing.href))
    }
  }, [])

  const normalizedUrl = useMemo(() => normalizeUrl(url), [url])
  const canSubmit = normalizedUrl.length > 0

  const submit = (): void => {
    if (!canSubmit) return
    insertLink({ text, url: normalizedUrl, title: title || undefined })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Insert link"
      icon={<Link2 size={17} />}
      size="sm"
      footer={
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canSubmit} onClick={submit}>
            Insert
          </Button>
        </ModalActions>
      }
    >
      <Field label="Link text" hint="Leave empty to show the URL itself.">
        <Input
          value={text}
          placeholder="MarkCraft documentation"
          onChange={(event) => setText(event.currentTarget.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
      </Field>

      <Field label="URL" required>
        <Input
          data-autofocus
          value={url}
          placeholder="https://example.com or ./notes.md"
          monospace
          onChange={(event) => setUrl(event.currentTarget.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
      </Field>

      <Field label="Title" hint="Optional tooltip shown on hover.">
        <Input
          value={title}
          placeholder="Optional"
          onChange={(event) => setTitle(event.currentTarget.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
      </Field>
    </Modal>
  )
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  // A bare domain is almost certainly meant as a web address.
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed) && !trimmed.includes(' ')) {
    return `https://${trimmed}`
  }
  return trimmed
}
