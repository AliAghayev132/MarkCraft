/**
 * Who the keyboard belongs to.
 *
 * The command registry listens on `document` in the capture phase and stops the
 * event once it matches an accelerator — which is right, and is what lets a
 * command win over an editor's own key handling. It is wrong the moment
 * something modal is on top: with a document open behind it, Ctrl+Z on the
 * canvas undid an edit in the document, Ctrl+S saved the document, and Ctrl+A
 * selected its text. All of it invisible, because the thing being changed was
 * covered up.
 *
 * A modal claims the keyboard while it is up. A count rather than a flag, so
 * two of them stacked release it in either order without the first one to close
 * handing it back while the second is still there.
 */
let claims = 0

export function claimKeyboard(): () => void {
  claims++

  let released = false
  return () => {
    // Guarded because React may run a cleanup twice in development, and a
    // count that went negative would hand the keyboard back for good.
    if (released) return
    released = true
    claims = Math.max(0, claims - 1)
  }
}

export function keyboardIsClaimed(): boolean {
  return claims > 0
}
