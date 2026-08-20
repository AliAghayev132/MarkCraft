/**
 * Every IPC call resolves to an `IpcResult`. Main never lets an exception cross
 * the bridge — failures are converted into typed, serialisable error objects so
 * the renderer can render them with the custom UI instead of guessing at
 * `Error.message` strings.
 */

export type IpcErrorCode =
  | 'ENOENT'
  | 'EACCES'
  | 'EPERM'
  | 'EBUSY'
  | 'EEXIST'
  | 'EISDIR'
  | 'ENOTDIR'
  | 'ENOTEMPTY'
  | 'ENOSPC'
  | 'FORBIDDEN_PATH'
  | 'TOO_LARGE'
  | 'NOT_MARKDOWN'
  | 'CANCELLED'
  | 'CONFLICT'
  | 'INVALID_ARGUMENT'
  | 'UNSUPPORTED'
  /*
   * A guess that did not work, or a file that was not a locked document.
   * Ordinary outcomes rather than faults: the first is what an unlock dialog
   * is *for*, and neither should end up in the log — a run of them is somebody
   * trying to remember their passphrase, not an application going wrong.
   */
  | 'WRONG_PASSPHRASE'
  | 'NOT_ENCRYPTED'
  | 'UNKNOWN'

export interface IpcError {
  code: IpcErrorCode
  message: string
  path?: string
  detail?: string
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError }

export const ok = <T>(data: T): IpcResult<T> => ({ ok: true, data })

export const fail = (
  code: IpcErrorCode,
  message: string,
  extra?: { path?: string; detail?: string }
): IpcResult<never> => ({ ok: false, error: { code, message, ...extra } })

/** Human-facing default copy for each error code, used by the toast layer. */
export const ERROR_TITLES: Record<IpcErrorCode, string> = {
  ENOENT: 'File not found',
  EACCES: 'Permission denied',
  EPERM: 'Operation not permitted',
  EBUSY: 'File is in use',
  EEXIST: 'Already exists',
  EISDIR: 'That is a folder',
  ENOTDIR: 'That is not a folder',
  ENOTEMPTY: 'Folder is not empty',
  ENOSPC: 'No space left on device',
  FORBIDDEN_PATH: 'Location is outside the workspace',
  TOO_LARGE: 'File is too large',
  NOT_MARKDOWN: 'Unsupported file type',
  CANCELLED: 'Cancelled',
  CONFLICT: 'File changed on disk',
  INVALID_ARGUMENT: 'Invalid request',
  UNSUPPORTED: 'Not supported',
  WRONG_PASSPHRASE: 'That passphrase does not open this document',
  NOT_ENCRYPTED: 'Not a locked document',
  UNKNOWN: 'Something went wrong'
}
