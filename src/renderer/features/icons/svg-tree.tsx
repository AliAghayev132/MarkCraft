// ── @lib ───────────────────────────────────────────────────────────────────
import { createElement, type ReactElement, type ReactNode } from '@lib/react'

// ── types ──────────────────────────────────────────────────────────────────
import type { ParsedSvg, SvgProfile } from './types'

/**
 * SVG from somewhere else, turned into React elements.
 *
 * The application has no `innerHTML` sink and this is why it can afford not to:
 * markup it did not write — an imported icon, a Mermaid diagram — is parsed
 * with the DOM's own XML parser and rebuilt element by element against an
 * allowlist. Anything unrecognised is dropped rather than rendered.
 *
 * Two profiles, because the two callers have genuinely different needs and
 * widening the icon allowlist to fit diagrams would weaken it for no reason:
 *
 * - `icon` — geometry only. A file someone downloaded and imported.
 * - `diagram` — geometry plus text and markers, for output *this application*
 *   generated from the document's own text. Still no scripts, no
 *   `foreignObject`, no event handlers, no remote references.
 */

const SHARED_ELEMENTS = [
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon'
]

const DIAGRAM_ONLY = [
  'text',
  'tspan',
  'marker',
  'defs',
  'use',
  'symbol',
  'clipPath',
  'title'
]

const PROFILE_ELEMENTS: Record<SvgProfile, Set<string>> = {
  icon: new Set([...SHARED_ELEMENTS, 'title', 'desc']),
  diagram: new Set([...SHARED_ELEMENTS, ...DIAGRAM_ONLY])
}

/** Elements that carry metadata rather than marks; never rendered. */
const METADATA = new Set(['title', 'desc'])

const SHARED_ATTRIBUTES = [
  'viewBox',
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'width',
  'height',
  'points',
  'fill',
  'fill-opacity',
  'fill-rule',
  'clip-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-opacity',
  'stroke-miterlimit',
  'opacity',
  'transform'
]

const DIAGRAM_ATTRIBUTES = [
  'class',
  'style',
  'id',
  'dx',
  'dy',
  'text-anchor',
  'dominant-baseline',
  'alignment-baseline',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'letter-spacing',
  'marker-end',
  'marker-start',
  'markerWidth',
  'markerHeight',
  'markerUnits',
  'refX',
  'refY',
  'orient',
  'preserveAspectRatio',
  'xml:space'
]

const PROFILE_ATTRIBUTES: Record<SvgProfile, Set<string>> = {
  icon: new Set(SHARED_ATTRIBUTES),
  diagram: new Set([...SHARED_ATTRIBUTES, ...DIAGRAM_ATTRIBUTES])
}

/** Attribute names React expects in camelCase. */
const REACT_NAMES: Record<string, string> = {
  viewBox: 'viewBox',
  class: 'className',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-opacity': 'strokeOpacity',
  'stroke-miterlimit': 'strokeMiterlimit',
  'text-anchor': 'textAnchor',
  'dominant-baseline': 'dominantBaseline',
  'alignment-baseline': 'alignmentBaseline',
  'font-size': 'fontSize',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  'font-style': 'fontStyle',
  'letter-spacing': 'letterSpacing',
  'marker-end': 'markerEnd',
  'marker-start': 'markerStart',
  'xml:space': 'xmlSpace'
}

/**
 * `style` arrives as a string and React wants an object. Only declarations that
 * look like plain `property: value` survive, which is what keeps a `url(...)`
 * or an `expression(...)` from riding along.
 */
function parseStyle(value: string): Record<string, string> | undefined {
  const style: Record<string, string> = {}

  for (const declaration of value.split(';')) {
    const [rawName, ...rest] = declaration.split(':')
    const name = rawName?.trim()
    const declared = rest.join(':').trim()
    if (!name || !declared) continue
    if (/url\s*\(|expression\s*\(|javascript:/i.test(declared)) continue
    if (!/^[a-z-]+$/i.test(name)) continue

    // React accepts camelCase keys.
    style[name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = declared
  }

  return Object.keys(style).length > 0 ? style : undefined
}

/**
 * Mermaid ships its own theme as a `<style>` block inside the SVG. It is
 * dropped, and the diagram is styled by `styles/document.css` instead —
 * targeting the class names Mermaid puts on its elements, using the
 * application's own tokens.
 *
 * That is both safer and better looking: no third-party CSS is ever injected
 * into the document, and a diagram follows the user's theme and accent the way
 * every other surface does, rather than carrying Mermaid's palette around.
 */
function convert(element: Element, key: string, profile: SvgProfile): ReactNode {
  const tag = element.tagName
  const lower = tag.toLowerCase()

  if (!PROFILE_ELEMENTS[profile].has(lower) && !PROFILE_ELEMENTS[profile].has(tag)) return null
  if (METADATA.has(lower)) return null

  const props: Record<string, unknown> = { key }

  for (const attribute of Array.from(element.attributes)) {
    if (!PROFILE_ATTRIBUTES[profile].has(attribute.name)) continue

    const value = attribute.value.trim()
    if (/javascript:/i.test(value)) continue

    if (attribute.name === 'style') {
      const style = parseStyle(value)
      if (style) props.style = style
      continue
    }

    // A `url(#id)` reference is legitimate inside a diagram — that is how an
    // arrowhead marker is attached — but never in an imported icon, where the
    // definition it points at was not carried over.
    if (/url\s*\(/i.test(value) && profile === 'icon') continue

    props[REACT_NAMES[attribute.name] ?? attribute.name] = value
  }

  const children: ReactNode[] = []
  let index = 0

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === 3) {
      // Text, which is what makes a diagram's labels legible.
      const text = child.textContent ?? ''
      if (text.trim()) children.push(text)
      continue
    }

    if (child.nodeType !== 1) continue
    const converted = convert(child as Element, `${key}-${index++}`, profile)
    if (converted) children.push(converted)
  }

  return createElement(lower, props, children.length > 0 ? children : undefined)
}

export function parseSvg(source: string, profile: SvgProfile): ParsedSvg | null {
  try {
    const document_ = new DOMParser().parseFromString(source, 'image/svg+xml')
    if (document_.querySelector('parsererror')) return null

    const root = document_.documentElement
    if (!root || root.tagName.toLowerCase() !== 'svg') return null

    const children: ReactNode[] = []
    let index = 0

    for (const child of Array.from(root.children)) {
      const converted = convert(child, `n${index++}`, profile)
      if (converted) children.push(converted)
    }

    if (children.length === 0) return null

    return {
      // A missing viewBox is common in hand-written files; 24 is the size the
      // rest of the icon set is drawn at, so it is the least surprising guess.
      viewBox: root.getAttribute('viewBox') ?? '0 0 24 24',
      children
    }
  } catch {
    return null
  }
}

export interface RenderSvgOptions {
  size?: number
  className?: string
  /** Resolves `currentColor` inside the markup. */
  color?: string
}

export function renderSvg(parsed: ParsedSvg, options: RenderSvgOptions = {}): ReactElement {
  const { size, className, color } = options

  return createElement(
    'svg',
    {
      viewBox: parsed.viewBox,
      ...(size ? { width: size, height: size } : {}),
      className,
      style: color ? { color } : undefined,
      'aria-hidden': 'true',
      focusable: 'false'
    },
    parsed.children
  )
}
