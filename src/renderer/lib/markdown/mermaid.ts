/**
 * Mermaid, loaded on demand.
 *
 * It is by far the largest thing the application can pull in, and most
 * documents contain no diagram at all — so it is behind a dynamic import and
 * costs nothing until a ```mermaid fence is actually rendered. The module is
 * cached after the first use, so a document full of diagrams pays once.
 *
 * Kept here rather than in a feature because it is a third-party engine, and
 * the vendor boundary is where those are allowed to be named.
 */

// ── mermaid ────────────────────────────────────────────────────────────────
// The engine's own type, taken from a type-only import so the rule that bans
// inline `import()` annotations is satisfied without loading the module.
import type MermaidApi from 'mermaid'

type Mermaid = typeof MermaidApi

let loader: Promise<Mermaid> | null = null

export interface MermaidTheme {
  /** Resolved from the application's theme, since Mermaid cannot read it. */
  dark: boolean
  fontFamily: string
}

export async function loadMermaid(theme: MermaidTheme): Promise<Mermaid> {
  loader ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      /*
       * `strict` sanitises the labels Mermaid renders, and `htmlLabels: false`
       * keeps it from emitting `<foreignObject>` — which matters because the
       * output is rebuilt as React elements against an allowlist, and a
       * foreignObject would be dropped, silently blanking every label.
       */
      securityLevel: 'strict',
      htmlLabels: false,
      flowchart: { htmlLabels: false },
      class: { htmlLabels: false },
      theme: theme.dark ? 'dark' : 'default',
      fontFamily: theme.fontFamily
    })

    return mermaid
  })

  return loader
}

/**
 * Re-initialises for a theme change. Mermaid holds its config globally, so the
 * only way to restyle is to tell it again.
 */
export async function setMermaidTheme(theme: MermaidTheme): Promise<void> {
  if (!loader) return
  const mermaid = await loader
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    flowchart: { htmlLabels: false },
    class: { htmlLabels: false },
    theme: theme.dark ? 'dark' : 'default',
    fontFamily: theme.fontFamily
  })
}
