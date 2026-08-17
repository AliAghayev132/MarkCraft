// ── @shared ────────────────────────────────────────────────────────────────
import { parseBlocks, type Span } from './blocks'

/**
 * Markdown to Rich Text Format.
 *
 * Written out rather than pulled in, because RTF is a text format and the
 * alternative is a dependency that would exist to emit a few dozen control
 * words. It is also the one export where a library would not help with the
 * part that actually matters: RTF predates Unicode, so every character above
 * ASCII has to be escaped by hand or an Azerbaijani document arrives as
 * mojibake — which is exactly the failure a "rich text" export must not have.
 *
 * The document structure comes from the shared block model, so this file is
 * only the control words.
 */

/** Half-points per heading level, largest first. */
const HEADING_SIZE = [36, 30, 26, 24, 22, 20]
const BODY_SIZE = 22

/*
 * Backslash and braces are RTF's own syntax. Escaping them first means the
 * control words emitted afterwards cannot be corrupted by document text that
 * happens to contain one.
 */
function escapeText(text: string): string {
  let out = ''

  for (const character of text) {
    const code = character.codePointAt(0) ?? 0

    if (character === '\\' || character === '{' || character === '}') {
      out += `\\${character}`
    } else if (code < 0x80) {
      out += character
    } else if (code <= 0xffff) {
      // `\uN` takes a *signed* 16-bit value, and the `?` after it is what a
      // reader that cannot handle the character shows instead.
      out += `\\u${code > 32767 ? code - 65536 : code}?`
    } else {
      // Outside the BMP: RTF has no wide form, so the surrogate pair is what
      // gets written — which is what modern readers expect.
      const offset = code - 0x10000
      out += `\\u${0xd800 + (offset >> 10) - 65536}?`
      out += `\\u${0xdc00 + (offset & 0x3ff) - 65536}?`
    }
  }

  return out
}

/**
 * Inline emphasis and code.
 *
 * A link's words are underlined and its target dropped: RTF's hyperlink field
 * is a nest of control words that half the readers in circulation get wrong,
 * and a document where the words survive reads better than one peppered with
 * broken fields.
 */
function runs(spans: Span[]): string {
  return spans
    .map((span) => {
      const marks =
        (span.bold ? '\\b' : '') +
        (span.italic ? '\\i' : '') +
        (span.strike ? '\\strike' : '') +
        (span.link ? '\\ul' : '') +
        (span.code ? '\\f1' : '')

      const text = escapeText(span.text)
      return marks === '' ? text : `{${marks} ${text}}`
    })
    .join('')
}

export function markdownToRtf(markdown: string, title = ''): string {
  const body: string[] = []
  const paragraph = (content: string, prefix = ''): void => {
    body.push(`{\\pard${prefix} ${content}\\par}`)
  }

  for (const block of parseBlocks(markdown)) {
    switch (block.kind) {
      case 'heading':
        paragraph(`\\b\\fs${HEADING_SIZE[block.level - 1]} ${runs(block.spans)}`, '\\sb200\\sa100')
        break
      case 'code':
        // Code keeps its spacing, and an empty line still needs a body.
        paragraph(`\\f1\\fs20 ${escapeText(block.text) || ' '}`, '\\li360')
        break
      case 'rule':
        // A thematic break has no text of its own; an empty bordered paragraph
        // is how RTF draws one.
        body.push('{\\pard\\brdrb\\brdrs\\brdrw10\\par}')
        break
      case 'quote':
        paragraph(`\\i ${runs(block.spans)}`, '\\li360')
        break
      case 'task':
        paragraph(`${block.done ? '\\u9745?' : '\\u9744?'}  ${runs(block.spans)}`, '\\li360')
        break
      case 'bullet':
        paragraph(`\\u8226?  ${runs(block.spans)}`, '\\li360')
        break
      case 'ordered':
        paragraph(`${block.index}.  ${runs(block.spans)}`, '\\li360')
        break
      default:
        paragraph(runs(block.spans))
    }
  }

  const header = [
    '{\\rtf1\\ansi\\ansicpg1252\\deff0',
    '{\\fonttbl{\\f0\\froman Georgia;}{\\f1\\fmodern Consolas;}}',
    title ? `{\\info{\\title ${escapeText(title)}}}` : '',
    `\\fs${BODY_SIZE}`
  ]
    .filter(Boolean)
    .join('')

  return `${header}\n${body.join('\n')}\n}`
}
