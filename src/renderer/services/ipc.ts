// ── @shared ────────────────────────────────────────────────────────────────
import { ERROR_TITLES, type IpcError, type IpcErrorCode, type IpcResult } from '@shared'

/**
 * A failed IPC call, carrying the typed code so callers can branch on it
 * (`CANCELLED` is routine, `CONFLICT` opens a modal, everything else toasts).
 */
export class ServiceError extends Error {
  readonly code: IpcErrorCode
  readonly title: string
  readonly path: string | undefined
  readonly detail: string | undefined

  constructor(error: IpcError) {
    super(error.message)
    this.name = 'ServiceError'
    this.code = error.code
    this.title = ERROR_TITLES[error.code] ?? ERROR_TITLES.UNKNOWN
    this.path = error.path
    this.detail = error.detail
  }

  get isCancellation(): boolean {
    return this.code === 'CANCELLED'
  }
}

/** Throws `ServiceError` on failure; returns the payload on success. */
export async function unwrap<T>(call: Promise<IpcResult<T>>): Promise<T> {
  const result = await call
  if (result.ok) return result.data
  throw new ServiceError(result.error)
}

/**
 * For calls whose failure is not worth interrupting the user over — a watcher
 * registration, a recents update. Returns `fallback` instead of throwing.
 */
export async function soft<T>(call: Promise<IpcResult<T>>, fallback: T): Promise<T> {
  try {
    const result = await call
    return result.ok ? result.data : fallback
  } catch {
    return fallback
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError
}

export function errorMessage(error: unknown): string {
  if (isServiceError(error)) return error.message
  if (error instanceof Error) return error.message
  return String(error)
}
