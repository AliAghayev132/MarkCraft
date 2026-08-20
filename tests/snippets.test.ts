import { describe, expect, it } from 'vitest'

import {
  SNIPPET_PLACEHOLDERS,
  cleanSnippet,
  expandSnippet,
  normaliseTrigger,
  removeSnippet,
  suggestSnippetName,
  upsertSnippet,
  validateSnippet,
  type Snippet,
  type SnippetContext
} from '@shared'

/**
 * Saved blocks and their placeholders.
 *
 * The expansion rules get the most attention: a snippet is somebody's own text
 * being reinserted into their own document, and the two ways to get that wrong
 * are both silent. Eating a `{{ site.title }}` that belonged to a static site
 * generator corrupts a file nobody will inspect until the build fails, and
 * putting the caret in the wrong place turns a two-second insertion into a
 * hunt.
 */

const NOW = new Date('2024-03-05T14:30:00Z')

function context(over: Partial<SnippetContext> = {}): SnippetContext {
  return { title: 'Notes', selection: '', now: NOW, locale: 'en-GB', ...over }
}

describe('expandSnippet', () => {
  it('fills in the date, the time and the title', () => {
    const { text } = expandSnippet('{{date}} | {{time}} | {{title}}', context())

    expect(text).toContain('2024')
    expect(text).toContain('Notes')
    expect(text).not.toContain('{{')
  })

  it('accepts spaces inside the braces', () => {
    expect(expandSnippet('{{ title }}', context()).text).toBe('Notes')
  })

  it('is not case sensitive about the name', () => {
    expect(expandSnippet('{{TITLE}}', context()).text).toBe('Notes')
  })

  it('wraps whatever was selected', () => {
    const { text } = expandSnippet('> [!NOTE]\n> {{selection}}', context({ selection: 'careful' }))

    expect(text).toBe('> [!NOTE]\n> careful')
  })

  it('puts the caret where the body asked for it', () => {
    const { text, cursor } = expandSnippet('> [!NOTE]\n> {{cursor}}rest', context())

    expect(text).toBe('> [!NOTE]\n> rest')
    expect(cursor).toBe('> [!NOTE]\n> '.length)
  })

  it('leaves the caret at the end when the body says nothing', () => {
    const { text, cursor } = expandSnippet('plain', context())

    expect(cursor).toBe(text.length)
  })

  it('honours only the first caret mark, since there is one caret', () => {
    const { cursor } = expandSnippet('a{{cursor}}b{{cursor}}c', context())

    expect(cursor).toBe(1)
  })

  it('counts the caret against the expanded text, not the body', () => {
    const { text, cursor } = expandSnippet('{{title}} - {{cursor}}', context())

    expect(text).toBe('Notes - ')
    expect(cursor).toBe(text.length)
  })

  /*
   * The one that matters most. Markdown files are fed to Hugo, Jekyll and
   * Eleventy, all of which use the same braces, and a writer who keeps their
   * site's templates in this editor must get them back unchanged.
   */
  it('leaves a placeholder it does not know exactly as it was written', () => {
    const body = 'Hello {{ site.title }} and {{unknown}}.'

    expect(expandSnippet(body, context()).text).toBe(body)
  })

  it('leaves single braces alone', () => {
    expect(expandSnippet('{date}', context()).text).toBe('{date}')
  })

  it('expands every placeholder it advertises', () => {
    for (const placeholder of SNIPPET_PLACEHOLDERS) {
      const { text } = expandSnippet(`[{{${placeholder}}}]`, context({ selection: 'S' }))

      expect(text, placeholder).not.toContain(placeholder)
    }
  })

  it('formats dates the way the language does', () => {
    const british = expandSnippet('{{date}}', context({ locale: 'en-GB' })).text
    const american = expandSnippet('{{date}}', context({ locale: 'en-US' })).text

    expect(british).not.toBe(american)
  })
})

describe('normaliseTrigger', () => {
  it('lower-cases and joins words with a dash', () => {
    expect(normaliseTrigger('  Warning Callout ')).toBe('warning-callout')
  })

  /* `matchSlash` stops the query at a slash, so one in a trigger is a trigger
     nobody could ever type. */
  it('removes the slash a writer typed out of habit', () => {
    expect(normaliseTrigger('/note')).toBe('note')
  })

  it('does not leave a dash dangling at either end', () => {
    expect(normaliseTrigger(' note ')).toBe('note')
    expect(normaliseTrigger('note/')).toBe('note')
  })

  it('reduces a trigger of nothing but spaces to nothing', () => {
    expect(normaliseTrigger('   ')).toBe('')
  })
})

describe('validateSnippet', () => {
  const existing: Snippet[] = [{ id: 'a', name: 'Note', trigger: 'note', body: 'x' }]

  it('accepts a complete one', () => {
    expect(
      validateSnippet({ id: 'b', name: 'Warn', trigger: 'warn', body: 'x' }, existing)
    ).toBeNull()
  })

  it('rejects one with no name', () => {
    expect(validateSnippet({ id: 'b', name: '  ', trigger: 'warn', body: 'x' }, existing)).toBe(
      'name'
    )
  })

  it('rejects one whose trigger could never be typed', () => {
    expect(validateSnippet({ id: 'b', name: 'Warn', trigger: ' / ', body: 'x' }, existing)).toBe(
      'trigger'
    )
  })

  it('rejects one that would insert nothing', () => {
    expect(validateSnippet({ id: 'b', name: 'Warn', trigger: 'warn', body: '' }, existing)).toBe(
      'body'
    )
  })

  it('rejects a trigger another snippet already answers to', () => {
    expect(validateSnippet({ id: 'b', name: 'Warn', trigger: 'Note', body: 'x' }, existing)).toBe(
      'duplicate'
    )
  })

  /* Editing a snippet must not report it as clashing with itself. */
  it('does not count the snippet being edited as its own clash', () => {
    expect(
      validateSnippet({ id: 'a', name: 'Note', trigger: 'note', body: 'y' }, existing)
    ).toBeNull()
  })
})

describe('the list', () => {
  const one: Snippet = { id: 'a', name: 'Note', trigger: 'note', body: 'x' }

  it('appends a snippet it has not seen', () => {
    expect(upsertSnippet([], one)).toEqual([one])
  })

  it('replaces one it has, in place', () => {
    const list = [one, { id: 'b', name: 'Warn', trigger: 'warn', body: 'y' }]
    const next = upsertSnippet(list, { ...one, body: 'changed' })

    expect(next).toHaveLength(2)
    expect(next[0].body).toBe('changed')
    expect(next[1].id).toBe('b')
  })

  it('cleans what it stores, so every path saves the same shape', () => {
    const [saved] = upsertSnippet([], { id: 'a', name: '  Note ', trigger: 'My Note', body: 'x' })

    expect(saved).toEqual({ id: 'a', name: 'Note', trigger: 'my-note', body: 'x' })
  })

  it('leaves the body alone, whitespace and all', () => {
    expect(cleanSnippet({ id: 'a', name: 'n', trigger: 't', body: '  keep\n\n' }).body).toBe(
      '  keep\n\n'
    )
  })

  it('removes by id', () => {
    expect(removeSnippet([one], 'a')).toEqual([])
    expect(removeSnippet([one], 'other')).toEqual([one])
  })

  it('does not modify the list it was given', () => {
    const list = [one]
    upsertSnippet(list, { id: 'b', name: 'Warn', trigger: 'warn', body: 'y' })

    expect(list).toHaveLength(1)
  })
})

describe('suggestSnippetName', () => {
  it('takes the first line that says something', () => {
    expect(suggestSnippetName('\n\n  Weekly review\nmore', 'Snippet')).toBe('Weekly review')
  })

  it('reads through the Markdown a heading or a bullet starts with', () => {
    expect(suggestSnippetName('## Agenda', 'Snippet')).toBe('Agenda')
    expect(suggestSnippetName('- [ ] Ship it', 'Snippet')).toBe('[ ] Ship it')
    expect(suggestSnippetName('> [!NOTE]', 'Snippet')).toBe('[!NOTE]')
  })

  it('falls back when there is nothing to read', () => {
    expect(suggestSnippetName('   \n\n', 'Snippet')).toBe('Snippet')
  })

  it('shortens a name that is really a paragraph', () => {
    const name = suggestSnippetName('x'.repeat(200), 'Snippet')

    expect(name).toHaveLength(48)
    expect(name.endsWith('…')).toBe(true)
  })
})
