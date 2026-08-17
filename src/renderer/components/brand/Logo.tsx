// ── @lib ───────────────────────────────────────────────────────────────────
import { memo, type ReactElement } from '@lib/react'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { LogoProps } from './types'

const SIZES = {
  xs: 'size-4',
  sm: 'size-5',
  md: 'size-7',
  lg: 'size-11',
  xl: 'size-18'
} as const

/**
 * The MarkCraft logo: a document card carrying the MC monogram over three
 * lines of text.
 *
 * The mark reads "Markdown document" before it reads "MarkCraft", which is the
 * right way round for something that will mostly be seen on `.md` files in a
 * file manager.
 *
 * Drawn as vector strokes rather than set in a typeface, for three reasons: the
 * weight stays optically correct from 16px in the title bar to 72px on the
 * start screen; the letterforms share one stroke weight and one radius with the
 * frame and the text lines, which no font would give for free; and it renders
 * identically on every platform regardless of what is installed.
 *
 * White tile, black ink, in both themes — it is a brand mark, not themed
 * chrome, so it must look identical wherever it appears and must survive being
 * exported to an `.ico` where no theme exists at all. The geometry is kept in
 * step with `build/icon.svg`, which is the same artwork.
 */
export const Logo = memo(function Logo({
  size = 'md',
  className,
  labelled = true
}: LogoProps): ReactElement {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cx('flex-none select-none', SIZES[size], className)}
      role={labelled ? 'img' : 'presentation'}
      aria-label={labelled ? 'MarkCraft' : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      <rect x="0" y="0" width="64" height="64" rx="15" fill="#ffffff" />

      {/* A hairline keeps the white tile defined on a light surface, where
          white-on-white would otherwise dissolve. */}
      <rect
        x="0.6"
        y="0.6"
        width="62.8"
        height="62.8"
        rx="14.5"
        fill="none"
        stroke="rgba(16,20,28,0.12)"
        strokeWidth="1.2"
      />

      {/* Geometry of record: build/icon.svg. Every stroke is centred on its
          path, so the clearances that matter are between *painted* edges. */}
      <g stroke="#14171e" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="11.5" y="12.5" width="41" height="39" rx="10" strokeWidth="2.6" />

        <path d="M18.25 31.5 V19 L23.5 26.8 L28.75 19 V31.5" strokeWidth="3" />
        <path d="M44.41 21.1 A6.2 6.2 0 1 0 44.41 29.4" strokeWidth="3" />

        {/* Three lines of text, the last one short, as a paragraph ends. */}
        <path d="M17.5 37.5 H46.5" strokeWidth="1.7" />
        <path d="M17.5 42 H46.5" strokeWidth="1.7" />
        <path d="M17.5 46.5 H36.5" strokeWidth="1.7" />
      </g>
    </svg>
  )
})
