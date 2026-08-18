import { describe, expect, it } from 'vitest'
import {
  basename,
  dirname,
  ensureExtension,
  isDescendantPath,
  relativeToRoot,
  joinPath,
  pathKey,
  pathsEqual,
  relativeFrom,
  stem,
  tildify,
  validateFileName
} from '@shared'

describe('path helpers', () => {
  it('extracts basenames from both separator styles', () => {
    expect(basename('C:\\Users\\me\\notes.md')).toBe('notes.md')
    expect(basename('/home/me/notes.md')).toBe('notes.md')
    expect(basename('C:\\Users\\me\\folder\\')).toBe('folder')
  })

  it('preserves the drive root when taking a dirname', () => {
    expect(dirname('C:\\notes.md')).toBe('C:\\')
    expect(dirname('C:\\Users\\me\\notes.md')).toBe('C:\\Users\\me')
    expect(dirname('/home/me/notes.md')).toBe('/home/me')
  })

  it('joins with the separator implied by the first segment', () => {
    expect(joinPath('C:\\Users\\me', 'docs', 'a.md')).toBe('C:\\Users\\me\\docs\\a.md')
    expect(joinPath('/home/me', 'docs', 'a.md')).toBe('/home/me/docs/a.md')
    expect(joinPath('C:\\Users\\me\\', '\\docs\\')).toBe('C:\\Users\\me\\docs')
  })

  it('compares Windows paths case-insensitively and POSIX paths exactly', () => {
    expect(pathsEqual('C:\\Users\\Me\\A.md', 'c:\\users\\me\\a.md')).toBe(true)
    expect(pathsEqual('/home/me/a.md', '/home/me/A.md')).toBe(false)
    expect(pathKey('C:\\Users\\Me\\')).toBe('c:\\users\\me')
  })

  it('detects descendants without matching sibling prefixes', () => {
    expect(isDescendantPath('C:\\work', 'C:\\work\\docs\\a.md')).toBe(true)
    expect(isDescendantPath('C:\\work', 'C:\\work')).toBe(true)
    // The classic prefix bug: "C:\work-notes" must not count as inside "C:\work".
    expect(isDescendantPath('C:\\work', 'C:\\work-notes\\a.md')).toBe(false)
    expect(isDescendantPath('/home/me', '/home/me2/a.md')).toBe(false)
  })

  it('builds Markdown-friendly relative paths', () => {
    expect(relativeFrom('C:\\work\\docs', 'C:\\work\\docs\\img\\a.png')).toBe('./img/a.png')
    expect(relativeFrom('C:\\work\\docs\\deep', 'C:\\work\\docs\\a.png')).toBe('../a.png')
    expect(relativeFrom('/home/me/docs', '/home/me/assets/a.png')).toBe('../assets/a.png')
  })

  it('tildifies paths under the home directory only', () => {
    expect(tildify('C:\\Users\\me\\docs', 'C:\\Users\\me')).toBe('~\\docs')
    expect(tildify('C:\\other\\docs', 'C:\\Users\\me')).toBe('C:\\other\\docs')
  })

  it('adds an extension only when it is missing', () => {
    expect(ensureExtension('notes', '.md')).toBe('notes.md')
    expect(ensureExtension('notes.md', '.md')).toBe('notes.md')
    expect(ensureExtension('notes.MD', '.md')).toBe('notes.MD')
  })

  it('strips the extension for a stem', () => {
    expect(stem('C:\\a\\notes.md')).toBe('notes')
    expect(stem('.gitignore')).toBe('.gitignore')
  })
})

describe('validateFileName', () => {
  it('accepts ordinary names', () => {
    expect(validateFileName('Meeting notes.md').valid).toBe(true)
    expect(validateFileName('2026-08-14 plan.md').valid).toBe(true)
  })

  it('rejects empty and reserved names', () => {
    expect(validateFileName('   ').valid).toBe(false)
    expect(validateFileName('.').valid).toBe(false)
    expect(validateFileName('..').valid).toBe(false)
  })

  it('rejects characters Windows forbids', () => {
    for (const name of ['a/b.md', 'a\\b.md', 'a:b.md', 'a*b.md', 'a?b.md', 'a"b.md', 'a<b.md']) {
      expect(validateFileName(name).valid).toBe(false)
    }
  })

  it('rejects Windows device names', () => {
    expect(validateFileName('CON').valid).toBe(false)
    expect(validateFileName('con.md').valid).toBe(false)
    expect(validateFileName('LPT1.txt').valid).toBe(false)
    // "console.md" merely starts with those letters and is fine.
    expect(validateFileName('console.md').valid).toBe(true)
  })

  it('rejects a trailing period but trims surrounding whitespace', () => {
    expect(validateFileName('notes.').valid).toBe(false)
    // Trimmed rather than refused: callers save the trimmed value, so a stray
    // space the user cannot see is not worth an error message.
    expect(validateFileName('notes ').valid).toBe(true)
    expect(validateFileName('  notes.md  ').valid).toBe(true)
  })
})

describe('relativeToRoot', () => {
  /*
   * The link graph, SUMMARY.md and the canvas all key their entries with
   * forward slashes, because a relative path in a document is a URL. This is
   * the one place that conversion happens.
   */
  it('uses forward slashes whatever the platform handed it', () => {
    expect(relativeToRoot('C:\\Users\\me\\notes', 'C:\\Users\\me\\notes\\ideas\\one.md')).toBe(
      'ideas/one.md'
    )
  })

  it('copes with the two separators mixed, which Windows paths routinely are', () => {
    expect(relativeToRoot('C:\\Users\\me\\notes', 'C:/Users/me/notes/ideas/one.md')).toBe(
      'ideas/one.md'
    )
  })

  it('ignores case on Windows, where the filesystem does', () => {
    expect(relativeToRoot('C:\\Users\\Me\\Notes', 'c:\\users\\me\\notes\\one.md')).toBe('one.md')
  })

  it('is exact on POSIX, where the filesystem is', () => {
    expect(relativeToRoot('/home/me/notes', '/home/Me/notes/one.md')).toBeNull()
    expect(relativeToRoot('/home/me/notes', '/home/me/notes/one.md')).toBe('one.md')
  })

  it('tolerates a trailing separator on the root', () => {
    expect(relativeToRoot('/home/me/notes/', '/home/me/notes/one.md')).toBe('one.md')
  })

  it('says nothing for a file outside the root', () => {
    expect(relativeToRoot('/home/me/notes', '/home/me/other/one.md')).toBeNull()
  })

  it('is not fooled by a sibling folder with the same prefix', () => {
    expect(relativeToRoot('/home/me/notes', '/home/me/notes-old/one.md')).toBeNull()
  })

  it('says nothing for the root itself, which is not a file in it', () => {
    expect(relativeToRoot('/home/me/notes', '/home/me/notes')).toBeNull()
  })

  it('says nothing when either side is missing', () => {
    expect(relativeToRoot(null, '/home/me/notes/one.md')).toBeNull()
    expect(relativeToRoot('/home/me/notes', null)).toBeNull()
  })
})
