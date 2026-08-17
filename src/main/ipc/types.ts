/**
 * Ipc contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { IpcChannel, IpcRequest, IpcResponse } from '@shared'

export type Handler<C extends IpcChannel> = (
  request: IpcRequest<C>
) => Promise<IpcResponse<C>> | IpcResponse<C>
