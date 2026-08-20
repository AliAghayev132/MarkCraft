/**
 * Blocks a writer saved to reuse.
 *
 * Kept pure and in `@shared` because both ends need it: the renderer expands a
 * snippet at the caret, and the main process stores the list in settings. The
 * expansion rules in particular have to be one implementation — a placeholder
 * that means one thing in the editor and another in a preview is worse than no
 * placeholder at all.
 */

export interface Snippet {
  /** Stable across renames; what settings and the menu agree on. */
  id: string
  /** What the writer calls it. Shown in the menu. */
  name: string
  /**
   * Typed after `/` to reach it. Lower case, no spaces — the slash trigger
   * stops at whitespace, so a two-word trigger could never be typed.
   */
  trigger: string
  /** Markdown, with `{{…}}` placeholders expanded on insertion. */
  body: string
}

/** What a snippet can ask about the moment it is being inserted. */
export interface SnippetContext {
  /** The open document's name, without its extension. */
  title: string
  /** Whatever was selected when the snippet was reached, possibly empty. */
  selection: string
  /** Now, passed in rather than read, so expansion stays pure and testable. */
  now: Date
  /** Formats dates and times the way the active language does. */
  locale?: string
}

/**
 * The placeholders a snippet may use.
 *
 * Deliberately few and all obvious. A snippet language grows into a
 * programming language if you let it, and a writer who has to debug their
 * snippet has lost more time than the snippet will ever save them.
 */
export const SNIPPET_PLACEHOLDERS = [
  'date',
  'time',
  'datetime',
  'title',
  'selection',
  'cursor'
] as const

export type SnippetPlaceholder = (typeof SNIPPET_PLACEHOLDERS)[number]

/*
 * Only whitespace is allowed around the name, so `{{ date }}` and `{{date}}`
 * are the same thing and a writer never has to look closely at their spacing.
 */
const PLACEHOLDER = /\{\{\s*([a-z]+)\s*\}\}/gi

/** Where the caret lands, and what to leave behind, once a snippet is used. */
export interface ExpandedSnippet {
  text: string
  /** Offset into `text`. The end unless the body marked a spot. */
  cursor: number
}

function formatDate(now: Date, locale: string | undefined): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(now)
}

function formatTime(now: Date, locale: string | undefined): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(now)
}

/**
 * Fills in a snippet body.
 *
 * A placeholder this does not know is left exactly as it was written. Markdown
 * files are fed to static site generators that use the same braces, and
 * quietly eating somebody's `{{ site.title }}` would corrupt their document to
 * no purpose.
 */
export function expandSnippet(body: string, context: SnippetContext): ExpandedSnippet {
  const { title, selection, now, locale } = context

  const value = (name: string): string | null => {
    switch (name) {
      case 'date':
        return formatDate(now, locale)
      case 'time':
        return formatTime(now, locale)
      case 'datetime':
        return `${formatDate(now, locale)} ${formatTime(now, locale)}`
      case 'title':
        return title
      case 'selection':
        return selection
      case 'cursor':
        return ''
      default:
        return null
    }
  }

  /*
   * Built by hand rather than with `replace`, because the caret has to be
   * measured against the *expanded* text. A callback's `offset` is an index
   * into the body, so `{{title}} — {{cursor}}` would put the caret several
   * characters past the end of a short title and short of it on a long one.
   */
  let out = ''
  let read = 0
  let cursor = -1

  for (const match of body.matchAll(PLACEHOLDER)) {
    const name = match[1].toLowerCase()
    const filled = value(name)
    // Not a placeholder this knows. Left exactly as it was written.
    if (filled === null) continue

    out += body.slice(read, match.index)
    read = match.index + match[0].length

    // Only the first one counts: a caret cannot be in two places, and the
    // second would silently win otherwise.
    if (name === 'cursor' && cursor === -1) cursor = out.length
    else out += filled
  }

  out += body.slice(read)

  return { text: out, cursor: cursor === -1 ? out.length : cursor }
}

/*
 * Everything a trigger cannot contain: whitespace, because `matchSlash` stops
 * there, and the slash itself, for the same reason.
 */
const TRIGGER_STRIP = /[\s/]+/g

/** A trigger reduced to something the slash menu can actually reach. */
export function normaliseTrigger(raw: string): string {
  return raw.trim().toLowerCase().replace(TRIGGER_STRIP, '-').replace(/^-+|-+$/g, '')
}

/**
 * Whether a snippet is fit to save, and why not.
 *
 * Returns a reason key rather than a sentence: the dialog that shows this is
 * translated, and a message built here would be built in one language.
 */
export type SnippetProblem = 'name' | 'trigger' | 'duplicate' | 'body'

export function validateSnippet(
  snippet: Pick<Snippet, 'id' | 'name' | 'trigger' | 'body'>,
  existing: readonly Snippet[]
): SnippetProblem | null {
  if (snippet.name.trim() === '') return 'name'

  const trigger = normaliseTrigger(snippet.trigger)
  if (trigger === '') return 'trigger'

  // An empty snippet inserts nothing, which looks exactly like a broken menu.
  if (snippet.body === '') return 'body'

  const clash = existing.some(
    (other) => other.id !== snippet.id && normaliseTrigger(other.trigger) === trigger
  )
  return clash ? 'duplicate' : null
}

/**
 * A snippet's list entry, ready to save.
 *
 * The trigger is normalised here rather than at the edges so that every path
 * that saves one — the dialog, "save selection", an imported file — stores the
 * same shape.
 */
export function cleanSnippet(snippet: Snippet): Snippet {
  return {
    id: snippet.id,
    name: snippet.name.trim(),
    trigger: normaliseTrigger(snippet.trigger),
    body: snippet.body
  }
}

/** Replaces one by id, or appends it if it is new. */
export function upsertSnippet(list: readonly Snippet[], snippet: Snippet): Snippet[] {
  const clean = cleanSnippet(snippet)
  const at = list.findIndex((other) => other.id === clean.id)
  if (at === -1) return [...list, clean]

  const next = [...list]
  next[at] = clean
  return next
}

export function removeSnippet(list: readonly Snippet[], id: string): Snippet[] {
  return list.filter((snippet) => snippet.id !== id)
}

/**
 * A name suggested from the text being saved.
 *
 * Somebody who selects a block and saves it wants it saved, not a dialog
 * demanding a name first — so the first meaningful line becomes the name and
 * they can change it later.
 */
export function suggestSnippetName(body: string, fallback: string): string {
  const line = body
    .split('\n')
    .map((each) => each.replace(/^[\s>#*+-]+/, '').trim())
    .find((each) => each !== '')

  if (line === undefined) return fallback
  return line.length > 48 ? `${line.slice(0, 47).trimEnd()}…` : line
}
