// ── @lib ───────────────────────────────────────────────────────────────────
import { FileWarning, Trash2 } from '@icons'
import type { ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { externalStateChanged, useAppDispatch } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import {
  acceptExternalChange,
  keepLocalVersion,
  saveDocument
} from '.'

// ── types ──────────────────────────────────────────────────────────────────
import type { ExternalChangeBannerProps } from './types'

const BANNER =
  'flex flex-none animate-slide-down items-center gap-2 border-b border-line-subtle bg-warning-bg px-3 py-1.5 text-ink'

/**
 * Surfaces a file that changed underneath the editor.
 *
 * Deliberately a persistent banner rather than a modal: the user can keep
 * reading and editing while they decide, and nothing is overwritten until they
 * choose. The one thing that never happens is a silent overwrite.
 */
export function ExternalChangeBanner({
  document
}: ExternalChangeBannerProps): ReactElement | null {
  const t = useT()
  const dispatch = useAppDispatch()

  if (document.external === 'none') return null

  const removed = document.external === 'removed'

  return (
    <div className={BANNER} role="alert">
      {removed ? (
        <Trash2 size={15} className="flex-none text-warning" />
      ) : (
        <FileWarning size={15} className="flex-none text-warning" />
      )}

      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-1.5">
        <strong className="text-sm font-medium">
          {t(removed ? 'external.deletedTitle' : 'external.changedTitle')}
        </strong>
        <span className="text-xs text-ink-secondary">
          {t(removed ? 'external.deletedDetail' : 'external.changedDetail')}
        </span>
      </div>

      <div className="flex flex-none items-center gap-1.5">
        {removed ? (
          <>
            <Button
              size="sm"
              onClick={() =>
                dispatch(externalStateChanged({ id: document.id, external: 'none', stamp: null }))
              }
            >
              {t('common.dismiss')}
            </Button>
            <Button size="sm" variant="primary" onClick={() => void saveDocument(document.id)}>
              {t('external.saveToRestore')}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => keepLocalVersion(document.id)}>
              {t('external.keepMine')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void acceptExternalChange(document.id)}
            >
              {t('external.reload')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
