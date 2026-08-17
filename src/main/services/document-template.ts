// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'

// ── ./services ─────────────────────────────────────────────────────────────
import { mimeForExtension } from './fs-service'

// ── types ──────────────────────────────────────────────────────────────────
import type { HtmlDocumentOptions } from './types'

/**
 * Paged, light-first stylesheet used for HTML export, PDF export and printing.
 *
 * This is deliberately independent of the renderer's preview CSS: the screen
 * preview is a scrolling, themeable surface, while this targets paper — it
 * fixes measure, forbids orphaned headings, and keeps code blocks from being
 * split across pages. Sharing one stylesheet between the two media would make
 * both worse.
 */
export function documentStylesheet(theme: 'light' | 'dark'): string {
  const dark = theme === 'dark'
  const fg = dark ? '#e6e8ee' : '#1b1f27'
  const muted = dark ? '#9aa3b2' : '#5b6472'
  const bg = dark ? '#14161c' : '#ffffff'
  const border = dark ? '#2c313c' : '#e3e6ec'
  const codeBg = dark ? '#1b1e26' : '#f6f7f9'
  const quoteBg = dark ? '#191c23' : '#f8f9fb'
  const link = dark ? '#8ab4ff' : '#2f5fd0'

  return `
:root { color-scheme: ${theme}; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: ${bg};
  color: ${fg};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 11.5pt;
  line-height: 1.68;
  -webkit-font-smoothing: antialiased;
}
.markcraft-document {
  max-width: 46em;
  margin: 0 auto;
  padding: 2.2em 1.6em 3em;
  word-wrap: break-word;
}
h1, h2, h3, h4, h5, h6 {
  line-height: 1.25;
  margin: 1.6em 0 0.6em;
  font-weight: 650;
  break-after: avoid-page;
  page-break-after: avoid;
}
h1 { font-size: 2em; margin-top: 0; letter-spacing: -0.02em; }
h2 { font-size: 1.5em; border-bottom: 1px solid ${border}; padding-bottom: 0.28em; }
h3 { font-size: 1.22em; }
h4 { font-size: 1.05em; }
h5, h6 { font-size: 1em; color: ${muted}; }
p, ul, ol, blockquote, table, pre, figure { margin: 0 0 1.05em; }
ul, ol { padding-left: 1.6em; }
li { margin: 0.24em 0; }
li > ul, li > ol { margin: 0.24em 0; }
li.task-list-item { list-style: none; margin-left: -1.35em; }
li.task-list-item input { margin-right: 0.5em; }
a { color: ${link}; text-decoration: none; }
a:hover { text-decoration: underline; }
blockquote {
  margin-left: 0;
  padding: 0.6em 1.1em;
  border-left: 3px solid ${border};
  background: ${quoteBg};
  color: ${muted};
  border-radius: 0 4px 4px 0;
  break-inside: avoid-page;
}
blockquote > :last-child { margin-bottom: 0; }

/* Callouts. Literal colours because this sheet stands alone — an exported
   page has none of the application tokens to inherit from. */
.mc-callout {
  border-left: 3px solid var(--callout-accent);
  background: var(--callout-bg);
  border-radius: 6px;
  padding: 0.75em 1em;
  font-style: normal;
  color: inherit;
}
.mc-callout-title {
  margin: 0 0 0.35em;
  font-weight: 600;
  font-size: 0.875em;
  color: var(--callout-accent);
}
.mc-callout-title::before { content: var(--callout-glyph); margin-right: 0.4em; }
.mc-callout > :last-child { margin-bottom: 0; }
  .mc-callout-note { --callout-accent: #1e5fb4; --callout-bg: #eaf1fb; --callout-glyph: 'i'; }
  .mc-callout-tip { --callout-accent: #14804a; --callout-bg: #e8f5ee; --callout-glyph: '*'; }
  .mc-callout-important { --callout-accent: #6b3fd4; --callout-bg: #f0ebfc; --callout-glyph: '!'; }
  .mc-callout-warning { --callout-accent: #a55f00; --callout-bg: #fdf3e3; --callout-glyph: '!'; }
  .mc-callout-caution { --callout-accent: #c1372c; --callout-bg: #fdeceb; --callout-glyph: 'x'; }
code, kbd, samp {
  font-family: "Cascadia Code", "JetBrains Mono", Consolas, "Liberation Mono", monospace;
  font-size: 0.88em;
}
:not(pre) > code {
  background: ${codeBg};
  border: 1px solid ${border};
  border-radius: 4px;
  padding: 0.12em 0.36em;
}
pre {
  background: ${codeBg};
  border: 1px solid ${border};
  border-radius: 6px;
  padding: 0.9em 1.1em;
  overflow-x: auto;
  white-space: pre-wrap;
  break-inside: avoid-page;
  page-break-inside: avoid;
}
pre code { background: none; border: 0; padding: 0; font-size: 0.85em; line-height: 1.55; }
table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.95em;
  break-inside: avoid-page;
}
th, td { border: 1px solid ${border}; padding: 0.46em 0.7em; text-align: left; vertical-align: top; }
th { background: ${codeBg}; font-weight: 620; }
tbody tr:nth-child(even) { background: ${dark ? '#171a21' : '#fafbfc'}; }
img { max-width: 100%; height: auto; border-radius: 4px; break-inside: avoid-page; }
hr { border: 0; border-top: 1px solid ${border}; margin: 2em 0; }
figure { margin: 1.2em 0; text-align: center; }
figcaption { color: ${muted}; font-size: 0.88em; margin-top: 0.4em; }
sup a { font-size: 0.78em; }
.footnotes { border-top: 1px solid ${border}; margin-top: 2.4em; padding-top: 0.8em; font-size: 0.9em; color: ${muted}; }
mark { background: ${dark ? '#4a4322' : '#fff4c2'}; color: inherit; padding: 0 0.15em; }
del { color: ${muted}; }

.hljs-comment, .hljs-quote { color: ${dark ? '#7d8799' : '#8a9199'}; font-style: italic; }
.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-doctag { color: ${dark ? '#c792ea' : '#8250df'}; }
.hljs-string, .hljs-regexp, .hljs-addition { color: ${dark ? '#a5d6a7' : '#1a7f37'}; }
.hljs-number, .hljs-symbol, .hljs-bullet { color: ${dark ? '#f0a37e' : '#bc4c00'}; }
.hljs-title, .hljs-section, .hljs-name { color: ${dark ? '#82aaff' : '#0550ae'}; }
.hljs-attr, .hljs-attribute, .hljs-variable, .hljs-template-variable { color: ${dark ? '#ffcb6b' : '#953800'}; }
.hljs-type, .hljs-built_in, .hljs-class .hljs-title { color: ${dark ? '#89ddff' : '#0b7285'}; }
.hljs-meta { color: ${muted}; }
.hljs-deletion { color: ${dark ? '#ef9a9a' : '#cf222e'}; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: 700; }

@page { margin: 18mm 16mm; }
@media print {
  body { background: #ffffff; }
  .markcraft-document { max-width: none; padding: 0; }
  a { color: inherit; text-decoration: underline; }
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.78em; color: ${muted}; word-break: break-all; }
  h1, h2, h3 { break-after: avoid-page; }
  pre, blockquote, table, img { break-inside: avoid-page; }
}
`.trim()
}

export function buildHtmlDocument(options: HtmlDocumentOptions): string {
  const styles = options.includeStyles
    ? `<style>\n${documentStylesheet(options.theme)}\n</style>`
    : ''
  const base = options.baseDir ? `<base href="${fileUrl(options.baseDir)}/">` : ''

  return `<!DOCTYPE html>
<html lang="en" data-theme="${options.theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="MarkCraft">
<title>${escapeHtml(options.title)}</title>
${base}
${styles}
</head>
<body>
<article class="markcraft-document">
${options.body}
</article>
</body>
</html>`
}

function fileUrl(target: string): string {
  const normalized = target.replace(/\\/g, '/')
  const prefixed = normalized.startsWith('/') ? normalized : `/${normalized}`
  return `file://${encodeURI(prefixed).replace(/#/g, '%23')}`
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const SRC_ATTRIBUTE = /(<img\b[^>]*?\bsrc=)(["'])(.*?)\2/gi

/**
 * Rewrites relative `<img src>` values to data URIs so an exported HTML file is
 * a single self-contained artefact. Remote URLs are left untouched — we never
 * fetch the network during an export.
 */
export async function inlineImages(html: string, baseDir: string | null): Promise<string> {
  if (!baseDir) return html

  const tasks: Promise<{ token: string; replacement: string }>[] = []
  const seen = new Set<string>()

  for (const match of html.matchAll(SRC_ATTRIBUTE)) {
    const src = match[3] as string
    if (!src || seen.has(src)) continue
    if (/^(data:|https?:|file:|blob:)/i.test(src)) continue
    seen.add(src)

    tasks.push(
      (async () => {
        try {
          const absolute = path.resolve(baseDir, decodeURI(src))
          const buffer = await fs.readFile(absolute)
          const mime = mimeForExtension(path.extname(absolute))
          return { token: src, replacement: `data:${mime};base64,${buffer.toString('base64')}` }
        } catch {
          return { token: src, replacement: src }
        }
      })()
    )
  }

  const resolved = await Promise.all(tasks)
  const map = new Map(resolved.map((r) => [r.token, r.replacement]))

  return html.replace(SRC_ATTRIBUTE, (full, prefix: string, quote: string, src: string) => {
    const replacement = map.get(src)
    return replacement ? `${prefix}${quote}${replacement}${quote}` : full
  })
}
