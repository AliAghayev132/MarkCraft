import { describe, expect, it } from 'vitest'

import {
  headingLevelAt,
  insertLink,
  insertText,
  setHeading,
  toggleLinePrefix,
  toggleWrap,
  type TextDocument
} from '@shared'

/**
 * Markdown formatting, as a pure operation on text and a selection.
 *
 * Written for the canvas, where a card is a plain text field rather than a
 * CodeMirror document, and tested here rather than through an interface — every
 * case is a sentence about a string, and there is no reason to open a window to
 * find out whether it is true.
 */
const doc = (text: string, from: number, to = from): TextDocument => ({ text, from, to })

/** The selection written back into the text, so a case reads at a glance. */
const show = (result: TextDocument): string =>
  `${result.text.slice(0, result.from)}[${result.text.slice(result.from, result.to)}]${result.text.slice(result.to)}`

describe('wrapping', () => {
  it('wraps the selection', () => {
    expect(show(toggleWrap(doc('make this bold', 5, 9), '**'))).toBe('make **[this]** bold')
  })

  it('unwraps when the markers are inside the selection', () => {
    expect(show(toggleWrap(doc('make **this** bold', 5, 13), '**'))).toBe('make [this] bold')
  })

  it('unwraps when the markers are just outside it', () => {
    // Double-clicking `bold` inside `**bold**` selects the word, not the
    // markers — and pressing bold again has to make it plain.
    expect(show(toggleWrap(doc('make **this** bold', 7, 11), '**'))).toBe('make [this] bold')
  })

  it('keeps hold of the words, not the markers', () => {
    const bold = toggleWrap(doc('this', 0, 4), '**')
    const both = toggleWrap(bold, '*')

    expect(both.text).toBe('***this***')
  })

  it('wraps nothing when nothing is selected, ready to be typed into', () => {
    expect(show(toggleWrap(doc('', 0), '**'))).toBe('**[]**')
  })

  it('takes a different closing marker', () => {
    expect(show(toggleWrap(doc('x', 0, 1), '<mark>', '</mark>'))).toBe('<mark>[x]</mark>')
  })

  it('copes with a selection given backwards', () => {
    expect(show(toggleWrap(doc('this', 4, 0), '**'))).toBe('**[this]**')
  })
})

describe('line prefixes', () => {
  const QUOTE = /^>[ \t]?/

  it('quotes the line the caret is on', () => {
    expect(toggleLinePrefix(doc('one', 1), '> ', QUOTE).text).toBe('> one')
  })

  it('quotes every line the selection touches', () => {
    expect(toggleLinePrefix(doc('one\ntwo\nthree', 1, 9), '> ', QUOTE).text).toBe(
      '> one\n> two\n> three'
    )
  })

  it('unquotes only when all of them are quoted', () => {
    // One quoted line among two is somebody asking for two, not for one to be
    // undone — and the line that was already quoted stays at one level rather
    // than becoming nested, which is not what pressing the button means.
    expect(toggleLinePrefix(doc('> one\ntwo', 1, 8), '> ', QUOTE).text).toBe('> one\n> two')
    expect(toggleLinePrefix(doc('> one\n> two', 1, 9), '> ', QUOTE).text).toBe('one\ntwo')
  })

  it('leaves the untouched lines alone', () => {
    expect(toggleLinePrefix(doc('one\ntwo\nthree', 5, 6), '- ', /^- /).text).toBe(
      'one\n- two\nthree'
    )
  })

  it('keeps the selection over the same words', () => {
    const result = toggleLinePrefix(doc('one', 0, 3), '> ', QUOTE)
    expect(result.text.slice(result.from, result.to)).toBe('one')
  })
})

describe('headings', () => {
  it('makes a line a heading', () => {
    expect(setHeading(doc('Title', 2), 1).text).toBe('# Title')
  })

  it('changes level without stacking hashes', () => {
    expect(setHeading(doc('# Title', 4), 3).text).toBe('### Title')
  })

  it('takes the heading off when the level is already that one', () => {
    expect(setHeading(doc('## Title', 5), 2).text).toBe('Title')
  })

  it('makes a paragraph at level zero', () => {
    expect(setHeading(doc('### Title', 6), 0).text).toBe('Title')
  })

  it('applies to every line the selection touches', () => {
    expect(setHeading(doc('one\ntwo', 0, 7), 2).text).toBe('## one\n## two')
  })

  it('reports the level under the caret', () => {
    expect(headingLevelAt(doc('# One\n\nplain', 3))).toBe(1)
    expect(headingLevelAt(doc('# One\n\nplain', 9))).toBe(0)
    expect(headingLevelAt(doc('###### Six', 2))).toBe(6)
  })

  it('does not mistake a hash without a space for a heading', () => {
    expect(headingLevelAt(doc('#tag', 1))).toBe(0)
  })

  it('keeps the caret on the words when the marker changes length', () => {
    const result = setHeading(doc('Title', 5), 3)
    expect(result.text.slice(0, result.from)).toBe('### Title')
  })
})

describe('links', () => {
  it('makes the selection the label, ready for a target', () => {
    expect(show(insertLink(doc('read this', 5, 9)))).toBe('read [this]([])')
  })

  it('makes a selected address the target, ready for a label', () => {
    expect(show(insertLink(doc('https://example.com', 0, 19)))).toBe('[[]](https://example.com)')
  })

  it('takes a target it was given', () => {
    expect(insertLink(doc('here', 0, 4), 'https://example.com').text).toBe(
      '[here](https://example.com)'
    )
  })

  it('inserts an empty link when nothing is selected', () => {
    expect(insertLink(doc('', 0)).text).toBe('[]()')
  })
})

describe('inserting', () => {
  it('replaces the selection', () => {
    expect(insertText(doc('one two', 0, 3), 'ONE').text).toBe('ONE two')
  })

  it('leaves the caret where it was asked to', () => {
    const result = insertText(doc('', 0), '```\n\n```', 4)
    expect(result.from).toBe(4)
    expect(result.to).toBe(4)
  })
})
