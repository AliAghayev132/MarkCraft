import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Every theme the application can actually be in, checked against WCAG.
 *
 * Written after a report that "dark mode's colours are wrong" turned out to be
 * true of more than dark mode: the muted label colour failed its threshold in
 * six of the seven light palettes, and the amber accent sat at a luminance
 * where neither white nor black ink could be read on it. None of that is
 * visible by looking — the colours are individually plausible, and only the
 * pairing fails — so it needs measuring rather than reviewing.
 *
 * The tokens are read from the stylesheet rather than duplicated here, so a new
 * palette is covered the moment it is written, without anyone remembering to
 * add it.
 */

const STYLES = join(__dirname, '..', 'src', 'renderer', 'styles')

const css =
  readFileSync(join(STYLES, 'tokens.css'), 'utf8') +
  '\n' +
  readFileSync(join(STYLES, 'palettes.css'), 'utf8')

interface Block {
  attrs: Record<string, string>
  vars: Record<string, string>
}

const blocks: Block[] = []
for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = rule[1].trim()
  if (selector.startsWith('@') || !selector.includes(':root')) continue

  const attrs: Record<string, string> = {}
  for (const attr of selector.matchAll(/\[data-([\w-]+)='([^']+)'\]/g)) attrs[attr[1]] = attr[2]

  const vars: Record<string, string> = {}
  for (const declaration of rule[2].matchAll(/(--mc-[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[declaration[1]] = declaration[2].trim()
  }

  blocks.push({ attrs, vars })
}

/** The tokens in force for one combination, with `var()` chains followed. */
function resolve(want: Record<string, string | null>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const block of blocks) {
    if (Object.entries(block.attrs).every(([key, value]) => want[key] === value)) {
      Object.assign(out, block.vars)
    }
  }

  const deref = (value: string | undefined, depth = 0): string => {
    if (depth > 6 || value === undefined) return ''
    const alias = value.match(/^var\((--mc-[\w-]+)\)$/)
    return alias ? deref(out[alias[1]], depth + 1) : value
  }
  for (const key of Object.keys(out)) out[key] = deref(out[key])
  return out
}

interface Rgb {
  r: number
  g: number
  b: number
}

function parseHex(value: string | undefined): Rgb | null {
  const hex = (value ?? '').trim().replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  }
}

function luminance({ r, g, b }: Rgb): number {
  const channel = (raw: number): number => {
    const value = raw / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const high = Math.max(luminance(a), luminance(b))
  const low = Math.min(luminance(a), luminance(b))
  return (high + 0.05) / (low + 0.05)
}

/*
 * Text owes 4.5:1. Accents and status colours are read as shapes — a button
 * fill, a warning stripe — and owe the 3:1 that WCAG asks of a non-text
 * element.
 */
const PAIRS: [fg: string, bg: string, need: number][] = [
  ['text-primary', 'bg-app', 4.5],
  ['text-primary', 'bg-surface', 4.5],
  ['text-primary', 'bg-sunken', 4.5],
  ['text-secondary', 'bg-app', 4.5],
  ['text-secondary', 'bg-surface', 4.5],
  ['text-secondary', 'bg-sunken', 4.5],
  ['text-tertiary', 'bg-app', 4.5],
  ['text-tertiary', 'bg-surface', 4.5],
  ['text-tertiary', 'bg-sunken', 4.5],
  ['text-on-accent', 'accent', 4.5],
  ['accent', 'bg-app', 3],
  ['accent', 'bg-surface', 3],
  ['danger', 'bg-surface', 3],
  ['success', 'bg-surface', 3],
  ['warning', 'bg-surface', 3]
]

const values = (name: string): string[] => [
  ...new Set(blocks.flatMap((block) => (block.attrs[name] ? [block.attrs[name]] : [])))
]

// `null` is the bare `:root` case — the default palette and accent, which carry
// no attribute of their own.
const THEMES = ['light', 'dark']
const PALETTES: (string | null)[] = [null, ...values('palette')]
const ACCENTS: (string | null)[] = [null, ...values('accent')]

describe('theme contrast', () => {
  it('found the stylesheets it is meant to be measuring', () => {
    expect(blocks.length).toBeGreaterThan(10)
    expect(PALETTES.length).toBeGreaterThan(3)
    expect(ACCENTS.length).toBeGreaterThan(3)
  })

  for (const theme of THEMES) {
    for (const palette of PALETTES) {
      for (const accent of ACCENTS) {
        const name = `${theme} / ${palette ?? 'default'} / ${accent ?? 'default'}`

        it(`is readable in ${name}`, () => {
          const tokens = resolve({ theme, palette, accent })
          const failures: string[] = []

          for (const [fgName, bgName, need] of PAIRS) {
            const fg = parseHex(tokens[`--mc-${fgName}`])
            const bg = parseHex(tokens[`--mc-${bgName}`])

            // A palette that does not restyle a token inherits it; a token that
            // resolves to a translucent value is measured where it is painted,
            // by the live sweep rather than here.
            if (!fg || !bg) continue

            const ratio = contrast(fg, bg)
            if (ratio < need) {
              failures.push(
                `${fgName} on ${bgName}: ${ratio.toFixed(2)} < ${need} ` +
                  `(${tokens[`--mc-${fgName}`]} on ${tokens[`--mc-${bgName}`]})`
              )
            }
          }

          expect(failures).toEqual([])
        })
      }
    }
  }
})
