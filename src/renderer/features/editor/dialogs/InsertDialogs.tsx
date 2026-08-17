// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement } from '@lib/react'

// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, useAppDispatch, useAppSelector } from '@store'
import { insertDialogClosed, insertDialogOpened, selectInsertDialog } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { ImageDialog } from './ImageDialog'
import { LanguageDialog } from './LanguageDialog'
import { LinkDialog } from './LinkDialog'
import { TableDialog } from './TableDialog'

/**
 * Which insert dialog is open lives in the UI slice: it is a single
 * serialisable string, and putting it there means a command, the toolbar and a
 * keyboard shortcut all open the dialog the same way.
 */
export function openLinkDialog(): void {
  dispatch(insertDialogOpened('link'))
}

export function openImageDialog(): void {
  dispatch(insertDialogOpened('image'))
}

export function openTableDialog(): void {
  dispatch(insertDialogOpened('table'))
}

export function openLanguageDialog(): void {
  dispatch(insertDialogOpened('language'))
}

/** Mounted once. Renders whichever insert dialog is open. */
export function InsertDialogLayer(): ReactElement | null {
  const open = useAppSelector(selectInsertDialog)
  const storeDispatch = useAppDispatch()
  const close = (): void => {
    storeDispatch(insertDialogClosed())
  }

  if (open === 'link') return <LinkDialog onClose={close} />
  if (open === 'image') return <ImageDialog onClose={close} />
  if (open === 'table') return <TableDialog onClose={close} />
  if (open === 'language') return <LanguageDialog onClose={close} />
  return null
}
