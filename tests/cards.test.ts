import { describe, expect, it } from 'vitest'

import { cardKey, dueNow, NEW_CARD, parseCards, schedule, type CardState, type Grade } from '@shared'

describe('parseCards', () => {
  it('reads an inline card', () => {
    expect(parseCards('Ontology :: the study of being')).toEqual([
      { front: 'Ontology', back: 'the study of being', line: 1 }
    ])
  })

  it('reads a block card', () => {
    expect(parseCards('What is a monad?\n?\nA monoid in the category of endofunctors.')).toEqual([
      { front: 'What is a monad?', back: 'A monoid in the category of endofunctors.', line: 1 }
    ])
  })

  it('keeps a multi-line answer together', () => {
    const [card] = parseCards('Question\n?\nfirst line\nsecond line')
    expect(card.back).toBe('first line\nsecond line')
  })

  it('ends a block card at the blank line', () => {
    const cards = parseCards('Q1\n?\nA1\n\nnot a card\n\nQ2\n?\nA2')
    expect(cards.map((c) => c.front)).toEqual(['Q1', 'Q2'])
  })

  it('reports the line a card starts on', () => {
    expect(parseCards('intro\n\nTerm :: meaning').map((c) => c.line)).toEqual([3])
  })

  it('finds several inline cards', () => {
    expect(parseCards('a :: 1\nb :: 2').map((c) => c.back)).toEqual(['1', '2'])
  })

  /* A card in a fence is documentation about the syntax, not a card. */
  it('ignores anything inside a fenced block', () => {
    expect(parseCards('```md\nTerm :: meaning\nQ\n?\nA\n```')).toEqual([])
  })

  it('ignores prose that merely contains a colon pair', () => {
    expect(parseCards('The ratio was 3::4 in the sample.')).toEqual([])
  })

  it('needs both sides to be non-empty', () => {
    expect(parseCards('Question\n?\n')).toEqual([])
    expect(parseCards('?\nAnswer')).toEqual([])
  })

  it('finds nothing in an ordinary document', () => {
    expect(parseCards('# Title\n\nA paragraph with no cards.')).toEqual([])
  })
})

describe('schedule', () => {
  const after = (state: CardState, ...grades: Grade[]): CardState =>
    grades.reduce((current, grade) => schedule(current, grade), state)

  it('sends a forgotten card back to today, not tomorrow', () => {
    const state = after(NEW_CARD, 'good', 'good', 'good', 'again')
    expect(state.interval).toBe(0)
    expect(state.streak).toBe(0)
  })

  it('grows the gap over successive successes', () => {
    const one = after(NEW_CARD, 'good')
    const two = after(NEW_CARD, 'good', 'good')
    const three = after(NEW_CARD, 'good', 'good', 'good')

    expect(one.interval).toBe(1)
    expect(two.interval).toBe(6)
    expect(three.interval).toBeGreaterThan(two.interval)
  })

  it('moves the growth rate with how hard the card felt', () => {
    expect(schedule(NEW_CARD, 'easy').ease).toBeGreaterThan(NEW_CARD.ease)
    expect(schedule(NEW_CARD, 'hard').ease).toBeLessThan(NEW_CARD.ease)
    expect(schedule(NEW_CARD, 'good').ease).toBe(NEW_CARD.ease)
  })

  /* Below 1.3 the interval stops growing and the card is shown for ever. */
  it('never lets the ease fall through the floor', () => {
    let state = NEW_CARD
    for (let i = 0; i < 40; i++) state = schedule(state, 'again')
    expect(state.ease).toBe(1.3)
  })

  it('always gives a successful card at least a day', () => {
    expect(after(NEW_CARD, 'good', 'good', 'hard').interval).toBeGreaterThanOrEqual(1)
  })
})

describe('dueNow', () => {
  const NOW = 1_700_000_000_000

  it('returns the cards that are due, soonest first', () => {
    const cards = [
      { id: 'later', due: NOW + 1000 },
      { id: 'overdue', due: NOW - 5000 },
      { id: 'just', due: NOW }
    ]

    expect(dueNow(cards, NOW).map((c) => c.id)).toEqual(['overdue', 'just'])
  })

  it('is empty when nothing is due', () => {
    expect(dueNow([{ due: NOW + 1 }], NOW)).toEqual([])
  })
})

describe('cardKey', () => {
  it('is stable for the same card', () => {
    expect(cardKey('Q', 'A')).toBe(cardKey('Q', 'A'))
  })

  it('ignores surrounding whitespace, so reformatting keeps the history', () => {
    expect(cardKey('  Q  ', '\nA\n')).toBe(cardKey('Q', 'A'))
  })

  it('separates cards that differ on either side', () => {
    expect(cardKey('Q', 'A')).not.toBe(cardKey('Q', 'B'))
    expect(cardKey('Q', 'A')).not.toBe(cardKey('R', 'A'))
  })

  /* Main and the renderer both call this; a drifting key loses every schedule. */
  it('is a short, stable hex string', () => {
    expect(cardKey('Ontologiya', 'varlıq haqqında elm')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('holds no copy of the note text', () => {
    expect(cardKey('secret question', 'secret answer')).not.toContain('secret')
  })
})
