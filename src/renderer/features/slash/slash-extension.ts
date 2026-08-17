// ── @lib ───────────────────────────────────────────────────────────────────
import { EditorView, type Extension, keymap, Prec } from '@lib/editor/codemirror'

// ── @shared ────────────────────────────────────────────────────────────────
import { matchSlash } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
import { slashMenu } from './slash-store'

/**
 * Opens the `/` menu from the editor and lets it own the keys it needs.
 *
 * The caret never leaves the document while the menu is up: the user keeps
 * typing to narrow the list, and only the four navigation keys are borrowed.
 * A menu that took focus would make `/` a mode to escape from rather than a
 * shortcut, and would leave the half-typed `/head` behind on cancel.
 */
function detect(view: EditorView): void {
  const { state } = view

  // A multi-cursor or a selection is not someone reaching for a block menu,
  // and there would be no single caret to anchor it to.
  if (state.selection.ranges.length !== 1 || !state.selection.main.empty) {
    slashMenu.close()
    return
  }

  const cursor = state.selection.main.head
  const line = state.doc.lineAt(cursor)
  const trigger = matchSlash(line.text.slice(0, cursor - line.from))

  if (!trigger) {
    slashMenu.close()
    return
  }

  const from = cursor - trigger.length
  const coords = view.coordsAtPos(from)
  if (!coords) {
    slashMenu.close()
    return
  }

  slashMenu.show({
    query: trigger.query,
    from,
    to: cursor,
    anchor: {
      top: coords.top,
      left: coords.left,
      width: Math.max(1, coords.right - coords.left),
      height: coords.bottom - coords.top
    }
  })
}

/**
 * Replaces the typed `/query` with the block it stood for.
 *
 * The trigger text goes first and in its own transaction, so the block command
 * that follows sees the line exactly as it would if the user had run it from
 * the toolbar — a heading applied around a leftover `/h1` would prefix the
 * wrong text.
 */
export function commitSlash(view: EditorView): boolean {
  const state = slashMenu.get()
  const block = slashMenu.selected()
  if (!state || !block) return false

  slashMenu.close()
  view.dispatch({ changes: { from: state.from, to: state.to, insert: '' } })
  view.focus()
  block.run()

  return true
}

export function slashExtension(): Extension {
  return [
    EditorView.updateListener.of((update) => {
      if (!update.docChanged && !update.selectionSet && !update.focusChanged) return
      if (!update.view.hasFocus) {
        slashMenu.close()
        return
      }
      detect(update.view)
    }),

    /*
     * Above every other keymap: while the menu is open these keys belong to it,
     * and the list keymap would otherwise turn Enter into a new list item
     * before the menu ever saw it.
     */
    Prec.highest(
      keymap.of([
        { key: 'ArrowDown', run: () => (slashMenu.isOpen() ? (slashMenu.move(1), true) : false) },
        { key: 'ArrowUp', run: () => (slashMenu.isOpen() ? (slashMenu.move(-1), true) : false) },
        { key: 'Enter', run: commitSlash },
        { key: 'Tab', run: commitSlash },
        {
          key: 'Escape',
          run: () => {
            if (!slashMenu.isOpen()) return false
            slashMenu.close()
            return true
          }
        }
      ])
    )
  ]
}
