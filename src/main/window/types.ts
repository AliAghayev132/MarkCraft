/**
 * Window contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { ResolvedTheme } from '@shared'

export interface CreateWindowOptions {
  /**
   * Leave the window hidden when it becomes ready. The splash owns the reveal
   * in that case, so the two are never visible at the same time.
   */
  deferShow?: boolean
  /**
   * Paints the window before the renderer does. Without it a light-mode user
   * gets a dark flash on every launch, because the frame is drawn well before
   * the first React paint.
   */
  theme?: ResolvedTheme
}

export interface SplashOptions {
  /**
   * Which palette to draw in.
   *
   * Already resolved: `system` has been turned into a concrete light or dark by
   * the caller, because the splash window has no access to the store and no
   * business re-deciding what the application decided.
   */
  theme: ResolvedTheme
  /** Plays a short chime once the mark has faded in. */
  sound: boolean
}
