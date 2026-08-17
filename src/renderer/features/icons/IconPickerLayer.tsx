// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { DirEntry, IconSubject } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
import { IconPickerDialog } from './IconPickerDialog'

// ── @utils ─────────────────────────────────────────────────────────────────
import { createExternalStore, useExternalStore } from '@utils'

/**
 * Opening the icon picker from a context menu.
 *
 * The menu is a plain data structure evaluated outside React, so it cannot
 * render a dialog itself. A one-value external store lets the menu *ask* for
 * the dialog and the layer — mounted once, at the root — render it.
 */
const target = createExternalStore<IconSubject | null>(null)

export function openIconPicker(entry: DirEntry): void {
  target.set({
    kind: entry.kind === 'directory' ? 'directory' : 'file',
    name: entry.name,
    path: entry.path,
    ext: (entry.ext ?? '').toLowerCase()
  })
}

export function IconPickerLayer(): ReactElement {
  const subject = useExternalStore(target)

  return (
    <IconPickerDialog
      open={subject !== null}
      subject={subject}
      onClose={() => target.set(null)}
    />
  )
}
