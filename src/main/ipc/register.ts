// ── electron ───────────────────────────────────────────────────────────────
import { ipcMain } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import type { IpcChannel, IpcRequest, IpcResponse } from '@shared'
import { type IpcError, type IpcErrorCode, type IpcResult, fail, ok } from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { ForbiddenPathError } from '../security/path-guard'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

// ── types ──────────────────────────────────────────────────────────────────
import type { Handler } from './types'

const ERRNO_TO_CODE: Record<string, IpcErrorCode> = {
  ENOENT: 'ENOENT',
  EACCES: 'EACCES',
  EPERM: 'EPERM',
  EBUSY: 'EBUSY',
  EEXIST: 'EEXIST',
  EISDIR: 'EISDIR',
  ENOTDIR: 'ENOTDIR',
  ENOTEMPTY: 'ENOTEMPTY',
  ENOSPC: 'ENOSPC',
  EMFILE: 'UNKNOWN',
  EROFS: 'EACCES'
}

/**
 * Converts anything thrown inside a handler into a serialisable, typed error.
 * Raw `Error` objects must never cross the bridge — stack traces leak absolute
 * paths and the renderer cannot branch on a message string.
 */
export function toIpcError(error: unknown): IpcError {
  if (error instanceof ForbiddenPathError) {
    return { code: 'FORBIDDEN_PATH', message: error.message, path: error.targetPath }
  }

  const candidate = error as NodeJS.ErrnoException & { code?: string }
  const rawCode = typeof candidate?.code === 'string' ? candidate.code : undefined

  if (rawCode && rawCode in ERRNO_TO_CODE) {
    return {
      code: ERRNO_TO_CODE[rawCode] as IpcErrorCode,
      message: candidate.message || rawCode,
      ...(candidate.path ? { path: candidate.path } : {})
    }
  }

  // Handlers may throw with an explicit contract code, e.g. TOO_LARGE.
  if (rawCode && isIpcErrorCode(rawCode)) {
    return { code: rawCode, message: candidate.message || rawCode }
  }

  return {
    code: 'UNKNOWN',
    message: candidate?.message || 'An unexpected error occurred.'
  }
}

const KNOWN_CODES = new Set<string>([
  'FORBIDDEN_PATH',
  'TOO_LARGE',
  'NOT_MARKDOWN',
  'CANCELLED',
  'CONFLICT',
  'INVALID_ARGUMENT',
  'UNSUPPORTED',
  'UNKNOWN'
])

function isIpcErrorCode(value: string): value is IpcErrorCode {
  return KNOWN_CODES.has(value)
}

/**
 * Registers a channel from the shared contract. The channel name and the
 * handler's request/response types are checked against `IpcApi`, so a typo or a
 * drifted payload is a compile error rather than a runtime `undefined`.
 */
export function handle<C extends IpcChannel>(channel: C, handler: Handler<C>): void {
  ipcMain.handle(channel, async (_event, request: IpcRequest<C>): Promise<
    IpcResult<IpcResponse<C>>
  > => {
    try {
      return ok(await handler(request))
    } catch (error) {
      const ipcError = toIpcError(error)
      if (ipcError.code === 'UNKNOWN' || ipcError.code === 'FORBIDDEN_PATH') {
        logger.error(`ipc(${channel}) failed`, error)
      } else {
        logger.debug(`ipc(${channel}) -> ${ipcError.code}: ${ipcError.message}`)
      }
      return fail(ipcError.code, ipcError.message, {
        ...(ipcError.path ? { path: ipcError.path } : {}),
        ...(ipcError.detail ? { detail: ipcError.detail } : {})
      })
    }
  })
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw Object.assign(new Error(`"${field}" must be a non-empty string`), {
      code: 'INVALID_ARGUMENT'
    })
  }
  return value
}

export function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw Object.assign(new Error(`"${field}" must be an array of strings`), {
      code: 'INVALID_ARGUMENT'
    })
  }
  return value as string[]
}
