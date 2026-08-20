import { describe, expect, it } from 'vitest'

import {
  extractTags,
  fencedLines,
  filesWithTag,
  renameTag,
  summariseTags,
  tagsIn,
  type TaggedFile
} from '@shared'

/**
 * Tags.
 *
 * The graph shows which documents point at which; a tag is the connection that
 * runs through documents which never mention each other. Most of what is
 * tested here is what is *not* a tag — `C#`, `#include`, `issue #1` — because
 * a tag panel full of noise is worse than no tag panel.
 */
describe('what counts as a tag', () => {
  it('finds one at the start of a line', () => {
    expect(tagsIn('#urgent do this')).toEqual(['urgent'])
  })

  it('finds one after a space', () => {
    expect(tagsIn('do this #urgent')).toEqual(['urgent'])
  })

  it('finds one in brackets, which is where a note often puts it', () => {
    expect(tagsIn('the plan (#draft)')).toEqual(['draft'])
  })

  it('takes a nested tag whole', () => {
    expect(tagsIn('#reading/fiction/short')).toEqual(['reading/fiction/short'])
  })

  it('stops at punctuation', () => {
    expect(tagsIn('all #done.')).toEqual(['done'])
    expect(tagsIn('#one, #two')).toEqual(['one', 'two'])
  })

  it('is not a language called C#', () => {
    expect(tagsIn('written in C# and F#')).toEqual([])
  })

  it('is not an issue number', () => {
    // The most common false positive there is.
    expect(tagsIn('see issue #1 and #42')).toEqual([])
  })

  it('is not a colour with a digit in it, which is nearly all of them', () => {
    expect(tagsIn('the background is #ff0000 and #1a2b3c')).toEqual([])
  })

  it('does read a colour of pure letters as a tag, and that is the trade', () => {
    /*
     * `#ffffff` comes out as a tag. Excluding every six-character hex string
     * would also rule out `#decade`, `#beefed` and `#facade`, which are words
     * somebody would actually tag with — and a colour in prose is far rarer
     * than a word. Colours in code are already invisible: fences and inline
     * code are skipped.
     */
    expect(tagsIn('the background is #ffffff')).toEqual(['ffffff'])
    expect(tagsIn('a #decade of notes')).toEqual(['decade'])
  })

  it('is not a heading', () => {
    expect(tagsIn('# A heading\n\n## Another')).toEqual([])
  })

  it('is not a URL fragment', () => {
    expect(tagsIn('see https://example.com/page#section')).toEqual([])
  })

  it('is not inside a fence', () => {
    const markdown = ['before #real', '```c', '#include <stdio.h>', '```', 'after #alsoreal'].join(
      '\n'
    )
    expect(tagsIn(markdown)).toEqual(['real', 'alsoreal'])
  })

  it('is not inside inline code', () => {
    expect(tagsIn('the directive `#define` is not a tag, but #this is')).toEqual(['this'])
  })

  it('takes letters that are not English', () => {
    expect(tagsIn('#təcili and #срочно')).toEqual(['təcili', 'срочно'])
  })

  it('reports where each one is', () => {
    const uses = extractTags('one #a\ntwo\nthree #b')
    expect(uses).toEqual([
      { tag: 'a', line: 1 },
      { tag: 'b', line: 3 }
    ])
  })

  it('lists a repeated tag once, in the order first seen', () => {
    expect(tagsIn('#b then #a then #b again')).toEqual(['b', 'a'])
  })
})

describe('fenced lines', () => {
  it('covers the fence and everything in it', () => {
    expect([...fencedLines('a\n```\nb\n```\nc')].sort((x, y) => x - y)).toEqual([2, 3, 4])
  })

  it('runs to the end when a fence is never closed', () => {
    // Which is how every Markdown parser reads it.
    expect([...fencedLines('a\n```\nb\nc')].sort((x, y) => x - y)).toEqual([2, 3, 4])
  })

  it('is not closed by the other kind of fence', () => {
    expect(fencedLines('```\n~~~\nstill code\n```').has(3)).toBe(true)
  })
})

describe('tags across a workspace', () => {
  const files: TaggedFile[] = [
    { path: 'a.md', tags: ['project', 'urgent'] },
    { path: 'b.md', tags: ['project'] },
    { path: 'c.md', tags: ['reading/fiction'] },
    { path: 'd.md', tags: ['reading/history'] }
  ]

  it('counts the files carrying each tag', () => {
    const summary = summariseTags(files)
    expect(summary.find((entry) => entry.tag === 'project')?.count).toBe(2)
  })

  it('puts the most used first', () => {
    expect(summariseTags(files)[0].tag).toBe('project')
  })

  it('counts a parent for every child', () => {
    // Somebody clicking `reading` expects both of them.
    const summary = summariseTags(files)
    expect(summary.find((entry) => entry.tag === 'reading')?.count).toBe(2)
  })

  it('finds the files under a tag, and under its children', () => {
    expect(filesWithTag(files, 'reading')).toEqual(['c.md', 'd.md'])
    expect(filesWithTag(files, 'reading/fiction')).toEqual(['c.md'])
  })

  it('does not confuse a tag with one that merely starts the same', () => {
    const near: TaggedFile[] = [{ path: 'x.md', tags: ['readings'] }]
    expect(filesWithTag(near, 'reading')).toEqual([])
  })

  it('ignores case when looking, because people do not type it twice the same', () => {
    expect(filesWithTag(files, 'PROJECT')).toEqual(['a.md', 'b.md'])
  })
})

describe('renaming a tag', () => {
  it('renames it', () => {
    expect(renameTag('this is #old news', 'old', 'new')).toBe('this is #new news')
  })

  it('takes its children with it', () => {
    // Half a tree left pointing at a name that no longer exists is worse than
    // not renaming at all.
    expect(renameTag('#reading/fiction', 'reading', 'books')).toBe('#books/fiction')
  })

  it('leaves a tag that merely starts the same', () => {
    expect(renameTag('#readings', 'reading', 'books')).toBe('#readings')
  })

  it('leaves code alone', () => {
    const markdown = '```\n#old\n```\n#old'
    expect(renameTag(markdown, 'old', 'new')).toBe('```\n#old\n```\n#new')
  })

  it('renames every use, not only the first', () => {
    expect(renameTag('#a and #a', 'a', 'b')).toBe('#b and #b')
  })
})
