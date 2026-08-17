/* eslint-disable no-console */

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

function stamp(): string {
  return new Date().toISOString().slice(11, 23)
}

/**
 * Deliberately minimal. Errors and warnings always surface (they matter in
 * packaged builds when a user reports a problem); debug chatter is dev-only.
 */
export const logger = {
  debug(message: string, ...rest: unknown[]): void {
    if (isDev) console.log(`[${stamp()}] ${message}`, ...rest)
  },
  info(message: string, ...rest: unknown[]): void {
    console.log(`[${stamp()}] ${message}`, ...rest)
  },
  warn(message: string, ...rest: unknown[]): void {
    console.warn(`[${stamp()}] warn: ${message}`, ...rest)
  },
  error(message: string, error?: unknown): void {
    console.error(`[${stamp()}] error: ${message}`, error ?? '')
  }
}
