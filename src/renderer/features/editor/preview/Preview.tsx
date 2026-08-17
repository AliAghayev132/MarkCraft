// ── @lib ───────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from '@lib/react'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { useDebouncedValue } from '@hooks'

// ── @features ──────────────────────────────────────────────────────────────
import { renderMarkdown } from '@features/editor/markdown'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { PreviewProps } from './types'

/*
 * Short enough that the preview keeps pace with typing, with a ceiling so a
 * fast typist never outruns it — see . Rendering a large
 * document is the expensive part, which is why this is not simply zero.
 */
const RENDER_DEBOUNCE_MS = 45
const RENDER_MAX_WAIT_MS = 160

export function Preview({
  markdown,
  baseDir,
  settings,
  onOpenDocument,
  onVisibleLine,
  className,
  ref
}: PreviewProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const articleRef = useRef<HTMLElement | null>(null)
  const syncingRef = useRef(false)

  // Rendering is the expensive half of the split view, so it lags the editor by
  // a frame or two rather than blocking each keystroke.
  const debouncedMarkdown = useDebouncedValue(markdown, RENDER_DEBOUNCE_MS, RENDER_MAX_WAIT_MS)

  const rendered = useMemo(
    () =>
      renderMarkdown(debouncedMarkdown, {
        baseDir,
        onOpenDocument,
        gfm: settings.gfm,
        highlight: settings.codeHighlighting
      }),
    [debouncedMarkdown, baseDir, onOpenDocument, settings.gfm, settings.codeHighlighting]
  )

  /**
   * Scroll sync uses the `data-line` attributes stamped onto block elements
   * during rendering. Mapping an actual source line to an actual element is
   * far more stable than matching scroll percentages, which drift badly as soon
   * as the document contains an image or a long code block.
   */
  const scrollToLine = useCallback((line: number) => {
    const container = scrollRef.current
    const article = articleRef.current
    if (!container || !article) return

    const blocks = Array.from(article.querySelectorAll<HTMLElement>('[data-line]'))
    if (blocks.length === 0) return

    let target: HTMLElement | null = null
    for (const block of blocks) {
      const blockLine = Number(block.dataset.line)
      if (Number.isNaN(blockLine)) continue
      if (blockLine <= line) target = block
      else break
    }

    const element = target ?? blocks[0]
    if (!element) return

    syncingRef.current = true
    container.scrollTo({
      top: element.offsetTop - container.offsetTop - 12,
      behavior: 'auto'
    })
    // Release on the next frame so our own scroll event does not echo back.
    requestAnimationFrame(() => {
      syncingRef.current = false
    })
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      scrollToLine,
      getElement: () => articleRef.current,
      getHtml: () => articleRef.current?.innerHTML ?? ''
    }),
    [scrollToLine]
  )

  useEffect(() => {
    const container = scrollRef.current
    if (!container || !onVisibleLine) return

    const onScroll = (): void => {
      if (syncingRef.current) return
      const article = articleRef.current
      if (!article) return

      const top = container.scrollTop + container.offsetTop
      const blocks = article.querySelectorAll<HTMLElement>('[data-line]')

      let line = 1
      for (const block of blocks) {
        if (block.offsetTop > top + 8) break
        const blockLine = Number(block.dataset.line)
        if (!Number.isNaN(blockLine)) line = blockLine
      }

      onVisibleLine(line)
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [onVisibleLine])

  return (
    <div ref={scrollRef} className={cx('h-full overflow-x-hidden overflow-y-auto bg-surface', className)}>
      <article
        ref={articleRef}
        className={'mc-document'}
        // Preview content is generated from the document; the editor is the
        // only place it can be changed.
        aria-label="Rendered document"
      >
        {rendered}
      </article>
    </div>
  )
}
