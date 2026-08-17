// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { app, shell } from 'electron'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

/**
 * Sending a document by email, with the document actually attached.
 *
 * `mailto:` cannot carry an attachment — the `attach` parameter is not in the
 * spec and every mail client that once honoured it has since closed it as a
 * security hole. So the previous behaviour was to paste 1,500 characters of
 * Markdown into the body and hope, which is not "send someone the file".
 *
 * What does work everywhere is an `.eml` file: a complete RFC 5322 message,
 * which the operating system's default mail client opens as a *draft* with the
 * attachment already in place. The recipient then receives a real `.md` file
 * and needs nothing installed to read it — the plain-text part of the message
 * is the document itself.
 *
 * The message is assembled here rather than by a library because the format is
 * a handful of headers and a base64 blob, and a dependency that can send mail
 * is a much larger thing to own than one that cannot.
 */

/** Mail clients and transports fold base64 at 76 characters. */
const BASE64_LINE = 76

/** A draft older than this is a leftover; nothing needs it. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

export interface EmailDraft {
  subject: string
  /** Optional; the draft opens with an empty To: line when absent. */
  to: string
  /** The document itself, sent as the message body *and* as the attachment. */
  markdown: string
  /** Used for the attachment's filename. */
  fileName: string
}

export async function openEmailDraft(draft: EmailDraft): Promise<{ ok: boolean; message: string }> {
  const directory = path.join(app.getPath('temp'), 'markcraft-drafts')

  try {
    await fs.mkdir(directory, { recursive: true })
    void pruneOldDrafts(directory)

    const file = path.join(directory, `${safeStem(draft.fileName)}.eml`)
    await fs.writeFile(file, buildMessage(draft), 'utf8')

    // `openPath` resolves to an error *string*, not a rejection.
    const failure = await shell.openPath(file)
    if (failure) {
      logger.warn(`email: could not open draft — ${failure}`)
      return { ok: false, message: 'No application is registered to open email drafts' }
    }

    return { ok: true, message: 'Opening a draft in your mail client' }
  } catch (error) {
    logger.error('email: could not prepare draft', error)
    return { ok: false, message: 'Could not prepare the email' }
  }
}

/** A complete multipart message: readable body plus the file itself. */
function buildMessage({ subject, to, markdown, fileName }: EmailDraft): string {
  // Fixed rather than random: the message is written to disk and opened
  // locally, so uniqueness only has to hold within one message.
  const boundary = '----=_MarkCraft_Part_0001'
  const attachmentName = ensureMarkdownExtension(fileName)

  const headers = [
    'MIME-Version: 1.0',
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'X-Unsent: 1', // Outlook: open as an unsent draft rather than a received message.
    `Content-Type: multipart/mixed; boundary="${boundary}"`
  ]

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(Buffer.from(markdown, 'utf8').toString('base64')),
    '',
    `--${boundary}`,
    `Content-Type: text/markdown; charset="utf-8"; name="${attachmentName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachmentName}"`,
    '',
    wrap(Buffer.from(markdown, 'utf8').toString('base64')),
    '',
    `--${boundary}--`,
    ''
  ]

  // CRLF throughout: some clients reject a message with bare newlines.
  return [...headers, '', ...body].join('\r\n')
}

/** RFC 2047, so a non-ASCII subject survives the trip. */
function encodeHeader(value: string): string {
  const trimmed = value.trim() || 'Document'
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(trimmed)) return trimmed
  return `=?utf-8?B?${Buffer.from(trimmed, 'utf8').toString('base64')}?=`
}

function wrap(base64: string): string {
  const lines: string[] = []
  for (let i = 0; i < base64.length; i += BASE64_LINE) {
    lines.push(base64.slice(i, i + BASE64_LINE))
  }
  return lines.join('\r\n')
}

function ensureMarkdownExtension(name: string): string {
  const cleaned = safeStem(name)
  return /\.(md|markdown|mdown|mkd|mdx)$/i.test(name) ? `${cleaned}.md` : `${cleaned}.md`
}

/** Keeps a document title from becoming a path or a quote-breaking filename. */
function safeStem(name: string): string {
  const base = name.replace(/\.[^.]+$/, '')
  const cleaned = base.replace(/[^\p{L}\p{N} ._-]/gu, '-').trim()
  return (cleaned || 'document').slice(0, 80)
}

async function pruneOldDrafts(directory: string): Promise<void> {
  try {
    const names = await fs.readdir(directory)
    const cutoff = Date.now() - DRAFT_TTL_MS

    await Promise.all(
      names
        .filter((name) => name.endsWith('.eml'))
        .map(async (name) => {
          const file = path.join(directory, name)
          const stat = await fs.stat(file).catch(() => null)
          if (stat && stat.mtimeMs < cutoff) await fs.rm(file, { force: true })
        })
    )
  } catch {
    // A tidy-up that fails is not worth reporting.
  }
}
