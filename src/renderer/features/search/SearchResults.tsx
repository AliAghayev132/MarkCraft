// ── @lib ───────────────────────────────────────────────────────────────────
import { ChevronDown, ChevronRight } from '@icons'
import { memo, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { tildify } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { FileResultProps } from './types'

/**
 * One file's worth of matches.
 *
 * Memoised because a workspace search can return hundreds of groups and the
 * panel re-renders on every keystroke in the query field.
 */
export const FileResult = memo(function FileResult({
  file,
  homePath,
  collapsed,
  onToggle,
  onSelect,
  preview
}: FileResultProps): ReactElement {
  const t = useT()

  return (
    <section className="flex flex-col">
      <button
        type="button"
        className="flex h-6 min-w-0 items-center gap-1.5 px-2 text-left text-xs text-ink-secondary hover:bg-hover"
        onClick={onToggle}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}

        <span className="max-w-[55%] flex-none truncate font-medium text-ink">{file.name}</span>

        <span className="inline-grid h-[15px] min-w-[17px] flex-none place-items-center rounded-full bg-active px-1 text-[10px] text-ink-tertiary">
          {file.matches.length}
        </span>

        {/* RTL direction keeps the *end* of a long path visible, which is the
            part that identifies the file. */}
        <span className="min-w-0 flex-1 truncate text-left text-2xs text-ink-tertiary [direction:rtl]">
          {tildify(file.directory, homePath)}
        </span>
      </button>

      {collapsed
        ? null
        : file.matches.map((match, index) => (
            <button
              key={`${match.line}-${match.column}-${index}`}
              type="button"
              className="flex min-h-[22px] min-w-0 items-baseline gap-1.5 py-px pr-3 pl-6 text-left text-xs text-ink-secondary hover:bg-hover hover:text-ink"
              onClick={() => onSelect(match.line)}
            >
              <span className="min-w-[26px] flex-none text-right text-2xs tabular-nums text-ink-tertiary">
                {match.line}
              </span>

              <span className="min-w-0 flex-1 truncate font-mono text-2xs leading-normal">
                {match.preview.slice(0, match.previewOffset)}

                {/*
                  * While a replacement is being written, the matched words are
                  * struck through and what they become is shown beside them.
                  * "Replace in 40 files" is not something anybody should press
                  * on faith.
                  */}
                <mark
                  className={cx(
                    'rounded-[2px] px-px text-inherit',
                    preview === null ? 'bg-editor-match' : 'bg-danger-bg line-through opacity-70'
                  )}
                >
                  {match.preview.slice(match.previewOffset, match.previewOffset + match.length)}
                </mark>

                {preview === null ? null : (
                  <mark className="rounded-[2px] bg-success-bg px-px text-inherit">
                    {preview(
                      match.preview.slice(match.previewOffset, match.previewOffset + match.length)
                    )}
                  </mark>
                )}

                {match.preview.slice(match.previewOffset + match.length)}
              </span>
            </button>
          ))}

      {file.truncated ? (
        <div className="px-6 py-1 text-2xs italic text-ink-tertiary">{t('search.moreMatches')}</div>
      ) : null}
    </section>
  )
})
