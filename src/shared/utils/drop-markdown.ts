/**
 * The Markdown a dropped file should become.
 *
 * Pure, and in `shared`, so the mapping is one table rather than a guess made
 * separately in each place a file can land. What a file *is* decides the
 * syntax: an image embeds, a source file becomes a fenced block the reader can
 * see, and everything else becomes a link — a spreadsheet rendered as an image
 * is a broken image, and rendered as a fence is a page of noise.
 */
const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'])

/** Extension -> the language name a fence should carry. */
const FENCE_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sh: 'bash',
  bash: 'bash',
  ps1: 'powershell',
  sql: 'sql',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  html: 'html',
  css: 'css',
  scss: 'scss'
}

export type DropKind = 'image' | 'code' | 'link'

export function dropKindFor(fileName: string): DropKind {
  const extension = extensionOf(fileName)
  if (IMAGE.has(extension)) return 'image'
  if (extension in FENCE_LANGUAGE) return 'code'
  return 'link'
}

/**
 * `href` is what the document should point at — already relative, already
 * copied into the assets folder if that is what the settings ask for. This
 * function does not touch the filesystem; deciding *where* the bytes go is the
 * caller's job, and keeping the two apart is what makes this testable.
 */
export function dropMarkdown(fileName: string, href: string, contents?: string): string {
  const label = fileName.replace(/\.[^.]+$/, '')

  switch (dropKindFor(fileName)) {
    case 'image':
      return `![${label}](${encodeSpaces(href)})`

    case 'code': {
      const language = FENCE_LANGUAGE[extensionOf(fileName)] ?? ''
      // Without the text — a file too large to inline, or unreadable — a link
      // is still useful, and is honest about what it is.
      if (contents === undefined) return `[${fileName}](${encodeSpaces(href)})`

      const fence = longestFence(contents)
      return `${fence}${language}\n${contents.replace(/\n+$/, '')}\n${fence}`
    }

    default:
      return `[${fileName}](${encodeSpaces(href)})`
  }
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

/**
 * A fence longer than any run of backticks inside the file.
 *
 * A dropped Markdown or shell file may itself contain ``` — using three would
 * end the block early and spill the rest of the file into the document as
 * prose.
 */
function longestFence(contents: string): string {
  let longest = 2
  for (const run of contents.match(/`+/g) ?? []) longest = Math.max(longest, run.length)
  return '`'.repeat(longest + 1)
}

/** Spaces break Markdown link syntax; everything else is left readable. */
function encodeSpaces(href: string): string {
  return href.includes(' ') ? `<${href}>` : href
}
