import { describe, expect, it } from 'vitest'

import type { RootState, WorkspaceState } from '@store'
import { selectVisibleTree } from '@store'

import type { DirEntry } from '@shared'

/**
 * The Markdown-only filter is what makes the explorer a *Markdown* explorer:
 * a project folder is mostly files the editor cannot open, and those are hidden
 * until the user asks for them. Directories are exempt — hiding them would make
 * their Markdown contents unreachable.
 */

function file(name: string): DirEntry {
  return {
    name,
    path: `/w/${name}`,
    kind: 'file',
    size: 10,
    modifiedAt: 0,
    isSymlink: false,
    hasChildren: false,
    ext: name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  }
}

function directory(name: string): DirEntry {
  return {
    name,
    path: `/w/${name}`,
    kind: 'directory',
    size: 0,
    modifiedAt: 0,
    isSymlink: false,
    hasChildren: true,
    ext: ''
  }
}

const workspace: WorkspaceState = {
  root: '/w',
  rootName: 'w',
  children: {
    '/w': [
      directory('docs'),
      file('README.md'),
      file('notes.markdown'),
      file('script.ts'),
      file('photo.png'),
      file('Makefile')
    ]
  },
  expanded: {},
  loading: {},
  selection: [],
  lastSelected: null,
  filter: '',
  sortKey: 'name',
  sortDirection: 'asc',
  foldersFirst: true,
  showHidden: false,
  sidebarView: 'explorer',
  clipboard: null
}

function stateWith(markdownOnly: boolean): RootState {
  return {
    workspace,
    settings: { values: { files: { markdownOnly } } }
  } as unknown as RootState
}

function namesOf(markdownOnly: boolean): string[] {
  // The selector is memoised on its inputs, so each case needs a fresh call
  // with a distinct state object.
  return selectVisibleTree(stateWith(markdownOnly)).map((row) => row.name)
}

describe('selectVisibleTree', () => {
  it('hides files the editor cannot open', () => {
    const names = namesOf(true)

    expect(names).toContain('README.md')
    expect(names).toContain('notes.markdown')
    expect(names).not.toContain('script.ts')
    expect(names).not.toContain('photo.png')
    expect(names).not.toContain('Makefile')
  })

  it('always keeps directories, so their contents stay reachable', () => {
    expect(namesOf(true)).toContain('docs')
  })

  it('shows everything once the filter is switched off', () => {
    const names = namesOf(false)

    expect(names).toEqual(
      expect.arrayContaining(['docs', 'README.md', 'notes.markdown', 'script.ts', 'photo.png', 'Makefile'])
    )
  })

  it('preserves the tree order', () => {
    const all = namesOf(false)
    const filtered = namesOf(true)

    expect(filtered).toEqual(all.filter((name) => filtered.includes(name)))
  })
})
