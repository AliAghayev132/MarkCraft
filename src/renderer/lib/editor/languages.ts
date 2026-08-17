// ── @lib ───────────────────────────────────────────────────────────────────
import { LanguageDescription } from '@lib/editor/codemirror'

/**
 * Languages available for highlighting inside fenced code blocks.
 *
 * Every grammar is loaded lazily: opening a document with no code blocks pulls
 * none of them, and a document with a single TypeScript fence pulls exactly one
 * chunk. This is what keeps a 15-language editor from costing 15 languages of
 * startup time (§48).
 *
 * Adding a language is a single entry here — the architecture requirement in
 * §14 is satisfied by this table, not by shipping every grammar up front.
 */
export const codeLanguages: LanguageDescription[] = [
  LanguageDescription.of({
    name: 'javascript',
    alias: ['js', 'jsx', 'mjs', 'cjs', 'node'],
    extensions: ['js', 'jsx', 'mjs', 'cjs'],
    load: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true }))
  }),
  LanguageDescription.of({
    name: 'typescript',
    alias: ['ts'],
    extensions: ['ts'],
    load: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ typescript: true }))
  }),
  LanguageDescription.of({
    name: 'tsx',
    extensions: ['tsx'],
    load: () =>
      import('@codemirror/lang-javascript').then((m) =>
        m.javascript({ typescript: true, jsx: true })
      )
  }),
  LanguageDescription.of({
    name: 'html',
    alias: ['htm', 'vue', 'svelte'],
    extensions: ['html', 'htm'],
    load: () => import('@codemirror/lang-html').then((m) => m.html())
  }),
  LanguageDescription.of({
    name: 'css',
    alias: ['scss', 'less'],
    extensions: ['css'],
    load: () => import('@codemirror/lang-css').then((m) => m.css())
  }),
  LanguageDescription.of({
    name: 'json',
    alias: ['jsonc'],
    extensions: ['json'],
    load: () => import('@codemirror/lang-json').then((m) => m.json())
  }),
  LanguageDescription.of({
    name: 'python',
    alias: ['py'],
    extensions: ['py'],
    load: () => import('@codemirror/lang-python').then((m) => m.python())
  }),
  LanguageDescription.of({
    name: 'java',
    extensions: ['java'],
    load: () => import('@codemirror/lang-java').then((m) => m.java())
  }),
  LanguageDescription.of({
    name: 'cpp',
    alias: ['c', 'c++', 'h', 'hpp'],
    extensions: ['c', 'cpp', 'h', 'hpp'],
    load: () => import('@codemirror/lang-cpp').then((m) => m.cpp())
  }),
  LanguageDescription.of({
    name: 'rust',
    alias: ['rs'],
    extensions: ['rs'],
    load: () => import('@codemirror/lang-rust').then((m) => m.rust())
  }),
  LanguageDescription.of({
    name: 'go',
    alias: ['golang'],
    extensions: ['go'],
    load: () => import('@codemirror/lang-go').then((m) => m.go())
  }),
  LanguageDescription.of({
    name: 'php',
    extensions: ['php'],
    load: () => import('@codemirror/lang-php').then((m) => m.php())
  }),
  LanguageDescription.of({
    name: 'sql',
    extensions: ['sql'],
    load: () => import('@codemirror/lang-sql').then((m) => m.sql())
  }),
  LanguageDescription.of({
    name: 'xml',
    alias: ['svg', 'xsl'],
    extensions: ['xml', 'svg'],
    load: () => import('@codemirror/lang-xml').then((m) => m.xml())
  }),
  LanguageDescription.of({
    name: 'yaml',
    alias: ['yml'],
    extensions: ['yaml', 'yml'],
    load: () => import('@codemirror/lang-yaml').then((m) => m.yaml())
  }),
  LanguageDescription.of({
    name: 'markdown',
    alias: ['md'],
    extensions: ['md', 'markdown'],
    load: () => import('@codemirror/lang-markdown').then((m) => m.markdown())
  })
]
