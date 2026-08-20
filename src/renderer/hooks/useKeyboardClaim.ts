// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect } from '@lib/react'

// ── @features ──────────────────────────────────────────────────────────────
import { claimKeyboard } from '@features/commands'

/**
 * Takes the keyboard for as long as something modal is on screen.
 *
 * Every full-screen view and every dialog needs this, and each one needing to
 * remember it is how the canvas ended up sending its own Ctrl+Z to the document
 * behind it. One hook, called from the components that cover the application,
 * so the rule lives in one place and reads the same everywhere.
 */
export function useKeyboardClaim(active: boolean): void {
  useEffect(() => {
    if (!active) return
    return claimKeyboard()
  }, [active])
}
