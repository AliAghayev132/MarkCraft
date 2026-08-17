// ── docx ───────────────────────────────────────────────────────────────────
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from 'docx'

// ── @shared ────────────────────────────────────────────────────────────────
import { parseBlocks, type Block, type Span } from '@shared'

/**
 * Markdown to a Word document.
 *
 * Built on the same block model as the RTF export, so the two cannot drift:
 * whichever one a user picks, the headings, lists and code come out of the same
 * reading of their document.
 *
 * Unlike RTF this genuinely needs a library — a .docx is a zip of several XML
 * parts with a relationship graph between them, and hand-rolling that would be
 * a package's worth of code with none of a package's testing behind it.
 */
const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6
]

function runsOf(spans: Span[], allItalic = false): TextRun[] {
  return spans.map(
    (span) =>
      new TextRun({
        text: span.text,
        bold: span.bold,
        italics: span.italic || allItalic,
        strike: span.strike,
        // A link's words are underlined rather than linked: the target is a
        // relative path that will not resolve from wherever the file lands.
        underline: span.link ? {} : undefined,
        font: span.code ? 'Consolas' : undefined
      })
  )
}

function paragraphFor(block: Block): Paragraph {
  switch (block.kind) {
    case 'heading':
      return new Paragraph({ heading: HEADINGS[block.level - 1], children: runsOf(block.spans) })

    case 'code':
      return new Paragraph({
        // An empty line still needs a run, or Word collapses the blank away and
        // the code loses its shape.
        children: [new TextRun({ text: block.text || ' ', font: 'Consolas', size: 18 })],
        indent: { left: 360 },
        spacing: { before: 0, after: 0 }
      })

    case 'rule':
      return new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA', space: 1 } },
        children: []
      })

    case 'quote':
      return new Paragraph({
        children: runsOf(block.spans, true),
        indent: { left: 360 },
        alignment: AlignmentType.LEFT
      })

    case 'task':
      return new Paragraph({
        children: [new TextRun(block.done ? '☑  ' : '☐  '), ...runsOf(block.spans)],
        indent: { left: 360 }
      })

    case 'bullet':
      return new Paragraph({ children: runsOf(block.spans), bullet: { level: 0 } })

    case 'ordered':
      return new Paragraph({
        children: [new TextRun(`${block.index}.  `), ...runsOf(block.spans)],
        indent: { left: 360 }
      })

    default:
      return new Paragraph({ children: runsOf(block.spans) })
  }
}

/** The finished `.docx`, as bytes ready to write. */
export async function markdownToDocx(markdown: string, title = ''): Promise<Buffer> {
  const document = new Document({
    title: title || undefined,
    sections: [{ children: parseBlocks(markdown).map(paragraphFor) }]
  })

  return Packer.toBuffer(document)
}
