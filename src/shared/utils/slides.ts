/**
 * Splits a document into slides.
 *
 * A thematic break — `---` on its own line — is the separator, which is the
 * convention every Markdown presentation tool already uses. Nothing new has to
 * be written into the document to present it, and a document written for
 * reading still presents sensibly: the breaks an author already put between
 * sections are exactly where the slides should change.
 */
export interface Slide {
  markdown: string
  /** 1-based line where the slide starts, so a slide can be edited. */
  line: number
}

const FENCE = /^\s*(```|~~~)/
const BREAK = /^(-{3,}|\*{3,}|_{3,})\s*$/

export function splitSlides(markdown: string): Slide[] {
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/, (matched) =>
    // Front matter is not a slide break, but the lines still have to be counted.
    matched.replace(/[^\n]/g, '')
  )

  const lines = body.split('\n')
  const slides: Slide[] = []

  let current: string[] = []
  let startLine = 1
  let inFence = false
  let marker = ''

  const flush = (): void => {
    const text = current.join('\n').trim()
    if (text) slides.push({ markdown: text, line: startLine })
    current = []
  }

  lines.forEach((line, index) => {
    const fence = line.match(FENCE)
    if (fence) {
      if (!inFence) {
        inFence = true
        marker = fence[1]
      } else if (line.trim().startsWith(marker)) {
        inFence = false
      }
      current.push(line)
      return
    }

    // A rule inside a fence is code, not a break.
    if (!inFence && BREAK.test(line)) {
      flush()
      startLine = index + 2
      return
    }

    current.push(line)
  })

  flush()

  // A document with no breaks is one slide, not none — presenting it should
  // still work rather than showing an empty deck.
  return slides
}

/** The heading a slide leads with, for a speaker's overview. */
export function slideTitle(slide: Slide): string {
  for (const line of slide.markdown.split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.*\S)\s*$/)
    if (heading) return heading[1]
  }

  const first = slide.markdown.split('\n').find((line) => line.trim())
  return first ? first.trim().slice(0, 60) : ''
}
