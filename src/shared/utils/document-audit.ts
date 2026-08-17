/**
 * What a document contains, and what is wrong with it.
 *
 * Pure text analysis, in `shared` rather than the renderer, because the answer
 * is the same wherever it is asked and the only part that needs a process is
 * checking whether a relative target exists on disk — which is deliberately
 * left to the caller.
 *
 * Fenced code is removed before anything else runs. A `[link](x)` inside a code
 * sample is an example, not a link, and reporting it as broken would train
 * people to ignore the report.
 */
export type LinkKind = 'external' | 'anchor' | 'relative' | 'mail'

export interface DocumentLink {
  /** As written in the document. */
  target: string
  /** The visible text, or the alt text for an image. */
  text: string
  kind: LinkKind
  image: boolean
  /** 1-based, so a result can be clicked through to the line. */
  line: number
}

export interface DocumentAudit {
  words: number
  characters: number
  headings: number
  /** Headings whose slug collides — the reason an anchor link can go wrong. */
  duplicateHeadings: string[]
  codeBlocks: number
  images: number
  links: DocumentLink[]
  tasks: { total: number; done: number }
  /** Anchor targets that match no heading in this document. */
  danglingAnchors: DocumentLink[]
}

const FENCE = /^(```|~~~).*$[\s\S]*?^\1\s*$/gm
const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/

export function auditDocument(markdown: string): DocumentAudit {
  const body = markdown.replace(FRONT_MATTER, '')
  const codeBlocks = (body.match(FENCE) ?? []).length

  // Blanked rather than deleted, so every line number still refers to the
  // line the user would scroll to.
  const prose = body.replace(FENCE, (block) => block.replace(/[^\n]/g, ' '))
  const lines = prose.split('\n')

  const headings: string[] = []
  const links: DocumentLink[] = []
  let tasksTotal = 0
  let tasksDone = 0

  lines.forEach((line, index) => {
    const heading = line.match(/^(#{1,6})\s+(.*\S)\s*$/)
    if (heading) headings.push(heading[2])

    const task = line.match(/^\s*[-*+]\s+\[([ xX])\]/)
    if (task) {
      tasksTotal++
      if (task[1] !== ' ') tasksDone++
    }

    for (const match of line.matchAll(/(!?)\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)) {
      const [, bang, text, target] = match
      links.push({
        target,
        text,
        kind: classify(target),
        image: bang === '!',
        line: index + 1
      })
    }
  })

  const slugs = headings.map(slugFor)
  const anchors = new Set(slugs)

  return {
    words: countWords(prose),
    characters: body.length,
    headings: headings.length,
    duplicateHeadings: [...new Set(slugs.filter((slug, i) => slugs.indexOf(slug) !== i))],
    codeBlocks,
    images: links.filter((link) => link.image).length,
    links,
    tasks: { total: tasksTotal, done: tasksDone },
    danglingAnchors: links.filter(
      (link) => link.kind === 'anchor' && !anchors.has(link.target.slice(1))
    )
  }
}

function classify(target: string): LinkKind {
  if (target.startsWith('#')) return 'anchor'
  if (/^mailto:/i.test(target)) return 'mail'
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) return 'external'
  return 'relative'
}

/** The same rule the renderer gives headings, so the two agree on what an anchor is. */
export function slugFor(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
}

function countWords(text: string): number {
  const matches = text
    .replace(/[#>*_~`|-]/g, ' ')
    .trim()
    .match(/\S+/g)
  return matches ? matches.length : 0
}
