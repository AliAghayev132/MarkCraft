// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { clipboardService, toast } from '@services'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'
import { htmlToMarkdown, looksLikeHtml } from './html-to-markdown'

/**
 * Pastes the clipboard's HTML flavour as Markdown.
 *
 * A separate command rather than a hijack of Ctrl+V. Copying rich text and
 * getting Markdown *sometimes* — depending on what the source application put
 * on the clipboard — would be unpredictable in the worst way: the same gesture
 * doing two different things with no way to tell in advance which.
 */
export async function pasteAsMarkdown(): Promise<boolean> {
  const html = await clipboardService.readHtml()

  // Some applications write the plain text into the HTML slot as well; if
  // there is no markup in it there is nothing to convert.
  const source = html.trim() !== '' && looksLikeHtml(html) ? html : ''
  if (source === '') {
    toast.info(t('paste.noHtml'))
    return false
  }

  const markdown = htmlToMarkdown(source)
  if (markdown.trim() === '') {
    toast.info(t('paste.nothing'))
    return false
  }

  const view = editorRegistry.getSourceView()
  if (view) {
    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert: markdown },
      selection: { anchor: from + markdown.length }
    })
    view.focus()
    return true
  }

  const editor = editorRegistry.getRichEditor()
  if (!editor) return false

  // The rich editor speaks its own document model, so the Markdown goes in as
  // text and its own input rules turn it into structure.
  editor.chain().focus().insertContent(markdown).run()
  return true
}
