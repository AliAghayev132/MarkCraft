/**
 * Brand component contracts.
 *
 * Kept beside the components rather than inside them so the sizes the mark
 * supports are stated once — `Logo` and `Wordmark` must offer the same set, and
 * a shared type is what makes that true by construction.
 */

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface LogoProps {
  size?: LogoSize
  className?: string
  /** Set false when a wordmark beside it already names the app. */
  labelled?: boolean
}

export interface WordmarkProps {
  size?: LogoSize
  /** Hides the "MarkCraft" text, leaving the tile — used in tight chrome. */
  markOnly?: boolean
  className?: string
}
