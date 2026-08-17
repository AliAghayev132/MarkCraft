// ── @lib ───────────────────────────────────────────────────────────────────
import { CornerDownLeft, Search } from '@icons'
import {
  createPortal,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode
} from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { useEscapeKey, useFocusTrap, useScrollLock } from '@hooks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Kbd } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { formatAccelerator } from './shortcuts'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { Command, CommandPaletteProps } from './types'

interface Scored {
  command: Command
  score: number
  /** Character indices in the title that matched, for highlighting. */
  matches: number[]
}

/**
 * Fuzzy subsequence match, scored so consecutive characters and matches at word
 * boundaries rank highest — "tsb" should find "Toggle Sidebar" before anything
 * that merely contains those letters scattered about.
 */
function fuzzyScore(query: string, text: string): { score: number; matches: number[] } | null {
  if (!query) return { score: 0, matches: [] }

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  let score = 0
  let textIndex = 0
  let previousMatch = -2
  const matches: number[] = []

  for (const char of lowerQuery) {
    const found = lowerText.indexOf(char, textIndex)
    if (found === -1) return null

    matches.push(found)
    score += 1
    if (found === previousMatch + 1) score += 4
    if (found === 0 || /[\s\-_/.]/.test(lowerText[found - 1] ?? '')) score += 3

    previousMatch = found
    textIndex = found + 1
  }

  // Prefer shorter titles when match quality is otherwise equal.
  score += Math.max(0, 12 - text.length / 4)
  return { score, matches }
}

export function CommandPalette({
  open,
  onClose,
  commands,
  shortcuts
}: CommandPaletteProps): ReactElement | null {
  const t = useT()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  useEscapeKey(open, onClose)
  useFocusTrap(panelRef, open)
  useScrollLock(open)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  const results = useMemo<Scored[]>(() => {
    const available = commands.filter((command) => !command.enabled || command.enabled())

    if (!query.trim()) {
      return available.map((command) => ({ command, score: 0, matches: [] }))
    }

    const scored: Scored[] = []
    for (const command of available) {
      const haystack = `${command.categoryLabel} ${command.title} ${command.keywords ?? ''}`
      const titleMatch = fuzzyScore(query, command.title)
      const anyMatch = titleMatch ?? fuzzyScore(query, haystack)
      if (!anyMatch) continue

      scored.push({
        command,
        // A hit in the title itself is worth far more than one in the keywords.
        score: anyMatch.score + (titleMatch ? 25 : 0),
        matches: titleMatch ? titleMatch.matches : []
      })
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, 60)
  }, [commands, query])

  useEffect(() => setActiveIndex(0), [query])

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, results])

  const execute = (entry: Scored | undefined): void => {
    if (!entry) return
    onClose()
    // Let the overlay unmount before the command touches the editor, so focus
    // lands where the command expects it.
    requestAnimationFrame(() => void entry.command.run())
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % Math.max(1, results.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + results.length) % Math.max(1, results.length))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      execute(results[activeIndex])
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(Math.max(0, results.length - 1))
    }
  }

  const overlayRoot = document.getElementById('overlay-root')
  if (!open || !overlayRoot) return null

  return createPortal(
    <div
      className="fixed inset-0 z-palette flex animate-fade-in items-start justify-center bg-overlay px-4 pt-[12vh] pb-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.label')}
        className="flex max-h-[min(560px,70vh)] w-full max-w-[620px] animate-scale-in flex-col overflow-hidden rounded-xl border border-line bg-raised shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-[50px] flex-none items-center gap-2 border-b border-line-subtle px-4">
          <Search size={15} className="flex-none text-ink-tertiary" />

          <input
            data-autofocus
            type="text"
            className="h-full min-w-0 flex-1 border-none bg-transparent text-md text-ink outline-none placeholder:text-ink-tertiary"
            placeholder={t('palette.placeholder')}
            value={query}
            spellCheck={false}
            aria-label={t('palette.searchLabel')}
            aria-controls="command-palette-list"
            aria-activedescendant={`command-${activeIndex}`}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={onKeyDown}
          />

          <span className="flex-none text-2xs whitespace-nowrap text-ink-tertiary">
            {t('palette.commands', { count: results.length })}
          </span>
        </div>

        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className="min-h-0 flex-1 overflow-y-auto p-1.5"
        >
          {results.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-tertiary">{t('palette.noResults')}</div>
          ) : (
            results.map((entry, index) => {
              const accelerator = shortcuts.get(entry.command.id)
              const active = index === activeIndex

              return (
                <div
                  key={entry.command.id}
                  id={`command-${index}`}
                  role="option"
                  aria-selected={active}
                  data-active={active}
                  className={cx(
                    'group flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5',
                    active && 'bg-selected'
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => execute(entry)}
                >
                  <span
                    className={cx(
                      'grid size-4 flex-none place-items-center text-ink-tertiary',
                      active && 'text-accent'
                    )}
                  >
                    {entry.command.icon}
                  </span>

                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="truncate text-base text-ink">
                      {highlight(entry.command.title, entry.matches)}
                    </span>
                    <span className="flex-none text-2xs text-ink-tertiary">
                      {entry.command.categoryLabel}
                    </span>
                  </span>

                  {accelerator ? (
                    <Kbd keys={formatAccelerator(accelerator)} className="flex-none" />
                  ) : null}
                </div>
              )
            })
          )}
        </div>

        <div className="flex flex-none items-center gap-4 border-t border-line-subtle bg-sunken px-4 py-1.5">
          <span className="inline-flex items-center gap-1 text-2xs text-ink-tertiary">
            <Kbd keys="ArrowUp" /> <Kbd keys="ArrowDown" /> {t('palette.navigate')}
          </span>
          <span className="inline-flex items-center gap-1 text-2xs text-ink-tertiary">
            <CornerDownLeft size={11} /> {t('palette.run')}
          </span>
          <span className="inline-flex items-center gap-1 text-2xs text-ink-tertiary">
            <Kbd keys="Escape" /> {t('palette.dismiss')}
          </span>
        </div>
      </div>
    </div>,
    overlayRoot
  )
}

function highlight(text: string, matches: number[]): ReactNode {
  if (matches.length === 0) return text

  const set = new Set(matches)
  return [...text].map((char, index) =>
    set.has(index) ? (
      <mark key={index} className="bg-transparent font-semibold text-accent">
        {char}
      </mark>
    ) : (
      <span key={index}>{char}</span>
    )
  )
}
