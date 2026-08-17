/**
 * Finding the fenced code block a caret is inside.
 *
 * Pure and line-based rather than derived from the syntax tree: the caret can
 * be on the opening fence, on the closing one, or anywhere between, and it can
 * be inside a block that was never closed — which is exactly when someone is
 * still typing it and most likely to want to set its language.
 */
export interface Fence {
  /** 0-based line of the opening fence. */
  open: number
  /** 0-based line of the closing fence, or null when it was never closed. */
  close: number | null
  /** ``` or ~~~, whichever opened it. */
  marker: string
  /** The info string as written, trimmed. Empty when there is none. */
  language: string
  /** Column range of the info string on the opening line, for replacing it. */
  infoFrom: number
  infoTo: number
}

const OPEN = /^(\s*)(```|~~~)(.*)$/

export function fenceAt(markdown: string, line: number): Fence | null {
  const lines = markdown.split('\n')
  if (line < 0 || line >= lines.length) return null

  let current: Fence | null = null

  for (let at = 0; at < lines.length; at++) {
    const text = lines[at]

    if (current === null) {
      const opened = text.match(OPEN)
      if (!opened) continue

      const infoFrom = opened[1].length + opened[2].length
      current = {
        open: at,
        close: null,
        marker: opened[2],
        language: opened[3].trim(),
        infoFrom,
        infoTo: text.length
      }
      continue
    }

    // A closing fence is the same marker and nothing else of substance.
    if (text.trim().startsWith(current.marker) && text.trim().replace(/[`~]/g, '') === '') {
      current.close = at
      if (line >= current.open && line <= at) return current
      current = null
    }
  }

  // An unclosed block still counts, and is the likeliest one to be edited.
  return current !== null && line >= current.open ? current : null
}

/**
 * Rewrites the info string of the fence at `line`.
 *
 * Returns the document unchanged when the caret is not in a fence, so the
 * caller can treat "nothing to do" and "nothing changed" the same way.
 */
export function setFenceLanguage(markdown: string, line: number, language: string): string {
  const fence = fenceAt(markdown, line)
  if (!fence) return markdown

  const lines = markdown.split('\n')
  const opening = lines[fence.open]

  lines[fence.open] =
    opening.slice(0, fence.infoFrom) + (language ? language.trim() : '') + opening.slice(fence.infoTo)

  return lines.join('\n')
}
