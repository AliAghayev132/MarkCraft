// ── lowlight ───────────────────────────────────────────────────────────────
import { createLowlight } from 'lowlight'

// ── highlight.js/lib/languages/bash ────────────────────────────────────────
/* ── Grammars ────────────────────────────────────────────────────────────────
 * A curated set rather than lowlight's `common` bundle, which pulls in ~37
 * grammars and was on its own the largest single item in the renderer bundle.
 * This covers every language the product spec names plus the few that appear
 * constantly in technical writing.
 *
 * Adding a language is two lines: an import here and an entry in the map below.
 * ─────────────────────────────────────────────────────────────────────────── */
import bash from 'highlight.js/lib/languages/bash'

// ── highlight.js/lib/languages/c ───────────────────────────────────────────
import c from 'highlight.js/lib/languages/c'

// ── highlight.js/lib/languages/cpp ─────────────────────────────────────────
import cpp from 'highlight.js/lib/languages/cpp'

// ── highlight.js/lib/languages/csharp ──────────────────────────────────────
import csharp from 'highlight.js/lib/languages/csharp'

// ── highlight.js/lib/languages/css ─────────────────────────────────────────
import css from 'highlight.js/lib/languages/css'

// ── highlight.js/lib/languages/diff ────────────────────────────────────────
import diff from 'highlight.js/lib/languages/diff'

// ── highlight.js/lib/languages/go ──────────────────────────────────────────
import go from 'highlight.js/lib/languages/go'

// ── highlight.js/lib/languages/ini ─────────────────────────────────────────
import ini from 'highlight.js/lib/languages/ini'

// ── highlight.js/lib/languages/java ────────────────────────────────────────
import java from 'highlight.js/lib/languages/java'

// ── highlight.js/lib/languages/javascript ──────────────────────────────────
import javascript from 'highlight.js/lib/languages/javascript'

// ── highlight.js/lib/languages/json ────────────────────────────────────────
import json from 'highlight.js/lib/languages/json'

// ── highlight.js/lib/languages/markdown ────────────────────────────────────
import markdown from 'highlight.js/lib/languages/markdown'

// ── highlight.js/lib/languages/php ─────────────────────────────────────────
import php from 'highlight.js/lib/languages/php'

// ── highlight.js/lib/languages/plaintext ───────────────────────────────────
import plaintext from 'highlight.js/lib/languages/plaintext'

// ── highlight.js/lib/languages/python ──────────────────────────────────────
import python from 'highlight.js/lib/languages/python'

// ── highlight.js/lib/languages/ruby ────────────────────────────────────────
import ruby from 'highlight.js/lib/languages/ruby'

// ── highlight.js/lib/languages/rust ────────────────────────────────────────
import rust from 'highlight.js/lib/languages/rust'

// ── highlight.js/lib/languages/sql ─────────────────────────────────────────
import sql from 'highlight.js/lib/languages/sql'

// ── highlight.js/lib/languages/typescript ──────────────────────────────────
import typescript from 'highlight.js/lib/languages/typescript'

// ── highlight.js/lib/languages/xml ─────────────────────────────────────────
import xml from 'highlight.js/lib/languages/xml'

// ── highlight.js/lib/languages/yaml ────────────────────────────────────────
import yaml from 'highlight.js/lib/languages/yaml'

/**
 * The shared highlighter instance, used by the preview, the HTML/PDF export and
 * the rich editor's code-block node — so a fence renders identically in all
 * three.
 *
 * `lowlight` is synchronous by design here: the preview re-renders on a
 * debounce while the user types, and an async highlighter would make code
 * blocks flicker on every keystroke.
 */
export const lowlight = createLowlight({
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  go,
  ini,
  java,
  javascript,
  json,
  markdown,
  php,
  plaintext,
  python,
  ruby,
  rust,
  sql,
  typescript,
  xml,
  yaml
})

/** Aliases users actually type in fences, mapped to registered grammars. */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  node: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  yml: 'yaml',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  golang: 'go',
  'c++': 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  'c#': 'csharp',
  html: 'xml',
  vue: 'xml',
  svelte: 'xml',
  svg: 'xml',
  toml: 'ini',
  md: 'markdown',
  patch: 'diff',
  text: 'plaintext',
  txt: 'plaintext'
}

/** Resolves a fence info string to a registered grammar, or null if unknown. */
export function resolveLanguage(raw: string | undefined): string | null {
  if (!raw) return null
  const name = raw.toLowerCase().trim()
  const resolved = LANGUAGE_ALIASES[name] ?? name
  return lowlight.registered(resolved) ? resolved : null
}

export function listSupportedLanguages(): string[] {
  return lowlight.listLanguages().sort()
}
