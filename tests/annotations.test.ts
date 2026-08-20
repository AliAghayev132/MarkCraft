import { describe, expect, it } from 'vitest'

import {
  anchorFor,
  annotationFileFor,
  annotationLabel,
  locate,
  parseAnnotations,
  placeAll,
  serialiseAnnotations,
  type Annotation
} from '@shared'

/**
 * Finding again what a comment was about.
 *
 * Everything here is about one failure: a comment that ends up on the wrong
 * sentence. That is worse than a comment that admits it is lost, because
 * nobody checks — they read the note, they read whatever it is now sitting
 * beside, and they act on a sentence the author never meant.
 */

const DOCUMENT = [
  '# Payment plan',
  '',
  'The first instalment is due in March.',
  '',
  '## Notes',
  '',
  'The first instalment is due in March.',
  ''
].join('\n')

/** An anchor for the nth occurrence of `needle`. */
function anchorAt(text: string, needle: string, occurrence = 0): ReturnType<typeof anchorFor> {
  let at = -1
  for (let step = 0; step <= occurrence; step++) at = text.indexOf(needle, at + 1)
  return anchorFor(text, at, at + needle.length)
}

describe('anchorFor', () => {
  it('remembers the words the comment was left on', () => {
    expect(anchorAt(DOCUMENT, 'March').quote).toBe('March')
  })

  it('remembers a little of each side, to tell repeats apart', () => {
    const anchor = anchorAt(DOCUMENT, 'March')

    expect(anchor.prefix.endsWith('due in ')).toBe(true)
    expect(anchor.suffix.startsWith('.')).toBe(true)
  })

  it('copes with a selection at the very start', () => {
    const anchor = anchorFor(DOCUMENT, 0, 1)

    expect(anchor.prefix).toBe('')
    expect(anchor.quote).toBe('#')
  })

  it('copes with a selection at the very end', () => {
    const anchor = anchorFor(DOCUMENT, DOCUMENT.length - 1, DOCUMENT.length)

    expect(anchor.suffix).toBe('')
  })

  it('accepts a selection made backwards', () => {
    const at = DOCUMENT.indexOf('March')

    expect(anchorFor(DOCUMENT, at + 5, at).quote).toBe('March')
  })

  /* A comment on half a document should not carry the document with it. */
  it('does not remember an unlimited amount', () => {
    const huge = 'x'.repeat(5000)

    expect(anchorFor(huge, 0, huge.length).quote.length).toBeLessThanOrEqual(400)
  })
})

describe('locate', () => {
  it('finds a passage that has not moved', () => {
    const anchor = anchorAt(DOCUMENT, 'due in March')
    const found = locate(DOCUMENT, anchor)

    expect(found?.from).toBe(DOCUMENT.indexOf('due in March'))
    expect(found?.confidence).toBe('exact')
  })

  /* The whole reason offsets are not trusted. */
  it('follows the passage when text is added above it', () => {
    const anchor = anchorAt(DOCUMENT, 'due in March')
    const edited = `An added paragraph.\n\n${DOCUMENT}`
    const found = locate(edited, anchor)

    expect(edited.slice(found!.from, found!.to)).toBe('due in March')
  })

  it('follows it when text is removed above it', () => {
    const anchor = anchorAt(DOCUMENT, 'due in March')
    const edited = DOCUMENT.replace('# Payment plan\n\n', '')
    const found = locate(edited, anchor)

    expect(edited.slice(found!.from, found!.to)).toBe('due in March')
  })

  /*
   * Two identical sentences under different headings — the ordinary shape of a
   * document, and the case a search without context gets wrong.
   */
  it('tells two identical passages apart by what surrounds them', () => {
    const second = DOCUMENT.lastIndexOf('The first instalment')
    const anchor = anchorFor(DOCUMENT, second, second + 'The first instalment'.length)
    const found = locate(DOCUMENT, anchor)

    expect(found?.from).toBe(second)
  })

  it('still tells them apart after the document has been edited', () => {
    const second = DOCUMENT.lastIndexOf('The first instalment')
    const anchor = anchorFor(DOCUMENT, second, second + 'The first instalment'.length)

    const edited = `Preamble.\n\n${DOCUMENT}`
    const found = locate(edited, anchor)

    expect(found?.from).toBe(edited.lastIndexOf('The first instalment'))
  })

  it('says nothing when the passage is gone', () => {
    const anchor = anchorAt(DOCUMENT, 'March')

    expect(locate(DOCUMENT.replaceAll('March', 'April'), anchor)).toBeNull()
  })

  it('reports a passage whose surroundings were rewritten as moved', () => {
    const single = 'The instalment is due in March.\n'
    const at = single.indexOf('March')
    const found = locate('Deadline: March!\n', anchorFor(single, at, at + 5))

    expect(found).not.toBeNull()
    expect(found?.confidence).toBe('moved')
  })

  /* The other half of the same question: an untouched copy elsewhere in the
     document is a better match than the rewritten original, and should win. */
  it('prefers an untouched occurrence to a rewritten one', () => {
    const anchor = anchorAt(DOCUMENT, 'March')
    const edited = DOCUMENT.replace('The first instalment is due in March.', 'Deadline: March!')
    const found = locate(edited, anchor)

    expect(found?.from).toBe(edited.lastIndexOf('March'))
    expect(found?.confidence).toBe('exact')
  })

  it('finds a passage that moved a long way', () => {
    const anchor = anchorAt(DOCUMENT, 'due in March')
    const edited = `${'filler\n'.repeat(500)}${DOCUMENT}`
    const found = locate(edited, anchor)

    expect(edited.slice(found!.from, found!.to)).toBe('due in March')
  })

  it('refuses an empty quote rather than matching everything', () => {
    expect(locate(DOCUMENT, { quote: '', prefix: '', suffix: '', start: 0 })).toBeNull()
  })

  it('survives a quote that appears a great many times', () => {
    const many = 'a'.repeat(5000)
    const found = locate(many, { quote: 'a', prefix: '', suffix: '', start: 4000 })

    expect(found).not.toBeNull()
  })
})

describe('placeAll', () => {
  const make = (id: string, needle: string, createdAt = 1): Annotation => ({
    id,
    anchor: anchorAt(DOCUMENT, needle),
    body: `about ${needle}`,
    createdAt,
    resolved: false
  })

  it('reads down the document, whatever order they were written in', () => {
    const placed = placeAll(DOCUMENT, [make('b', 'Notes', 2), make('a', 'Payment plan', 1)])

    expect(placed.map((each) => each.id)).toEqual(['a', 'b'])
  })

  it('keeps a comment whose passage has gone, at the end', () => {
    const lost: Annotation = {
      id: 'lost',
      anchor: { quote: 'a sentence that was deleted', prefix: '', suffix: '', start: 0 },
      body: 'why did this go?',
      createdAt: 1,
      resolved: false
    }
    const placed = placeAll(DOCUMENT, [lost, make('a', 'Payment plan')])

    expect(placed.map((each) => each.id)).toEqual(['a', 'lost'])
    expect(placed[1].at).toBeNull()
  })

  it('leaves the comments it was given alone', () => {
    const list = [make('a', 'Notes')]
    placeAll(DOCUMENT, list)

    expect(list[0]).not.toHaveProperty('at')
  })

  it('makes an empty list out of no comments', () => {
    expect(placeAll(DOCUMENT, [])).toEqual([])
  })
})

describe('the side-file', () => {
  const one: Annotation = {
    id: 'a1',
    anchor: anchorAt(DOCUMENT, 'March'),
    body: 'Is this still right?',
    createdAt: 1_700_000_000_000,
    resolved: false
  }

  it('sits beside the document it belongs to', () => {
    expect(annotationFileFor('/notes/plan.md')).toBe('/notes/plan.md.comments.json')
  })

  it('survives being written and read back', () => {
    expect(parseAnnotations(serialiseAnnotations([one]))).toEqual([one])
  })

  it('is written as something a person could read and edit', () => {
    const json = serialiseAnnotations([one])

    expect(json).toContain('\n  ')
    expect(json.endsWith('\n')).toBe(true)
    expect(JSON.parse(json).version).toBe(1)
  })

  /*
   * It sits in the workspace where anyone can open it, so it will be edited by
   * hand and it will be replaced by something else. Neither may stop the
   * document opening.
   */
  it('makes no comments out of nonsense rather than failing', () => {
    expect(parseAnnotations('not json at all')).toEqual([])
    expect(parseAnnotations('null')).toEqual([])
    expect(parseAnnotations('[]')).toEqual([])
    expect(parseAnnotations('{"annotations":"nope"}')).toEqual([])
  })

  it('keeps the entries that are whole and drops the ones that are not', () => {
    const mixed = JSON.stringify({
      version: 1,
      annotations: [one, { id: 'broken' }, { anchor: one.anchor, body: 'no id' }, null]
    })

    expect(parseAnnotations(mixed)).toEqual([one])
  })
})

describe('annotationLabel', () => {
  it('flattens the passage onto one line', () => {
    expect(annotationLabel({ quote: 'two\n\nlines', prefix: '', suffix: '', start: 0 })).toBe(
      'two lines'
    )
  })

  it('shortens a passage that is really a paragraph', () => {
    const label = annotationLabel({ quote: 'x'.repeat(200), prefix: '', suffix: '', start: 0 })

    expect(label).toHaveLength(60)
    expect(label.endsWith('…')).toBe(true)
  })

  it('says nothing about an empty passage', () => {
    expect(annotationLabel({ quote: '   ', prefix: '', suffix: '', start: 0 })).toBe('')
  })
})
