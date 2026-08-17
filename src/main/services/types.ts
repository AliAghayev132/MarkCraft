/**
 * Services contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

export interface HtmlDocumentOptions {
  title: string
  body: string
  theme: 'light' | 'dark'
  includeStyles: boolean
  baseDir: string | null
}

/**
 * User-supplied translations.
 *
 * A `languages` folder in the app's data directory lets someone add or improve
 * a language in an *installed* copy — no rebuild, no toolchain. Files are plain
 * JSON with the same shape as the built-in locales, and any key they omit falls
 * back to English, so a half-finished translation is still usable.
 *
 * Nothing here executes user content: the files are parsed as data and every
 * unreadable one is skipped with a warning rather than failing the launch.
 */
export interface CustomLocaleFile {
  code: string
  messages: Record<string, unknown>
}
