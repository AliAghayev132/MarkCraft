// ── ../services ────────────────────────────────────────────────────────────
import {
  joinSession,
  localAddress,
  machineName,
  onSessionEvent,
  sessionRole,
  shareCanvas,
  shareCursor,
  shareSelection,
  startHosting,
  stopSession
} from '../services/session-service'

// ── ../window ──────────────────────────────────────────────────────────────
import { emitToRenderer } from '../window/main-window'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

/**
 * Working on one canvas together.
 *
 * No path guard: nothing here reads or writes the filesystem. The canvas
 * crosses as data, and whatever anyone does with it afterwards goes through the
 * file handlers, which do guard.
 */
export function registerSessionHandlers(): void {
  // Straight through: what one machine says, the local canvas hears. The
  // renderer decides what to do with it — main is the wire, not the model.
  onSessionEvent((event) => emitToRenderer('event:session', event))

  handle('session:host', ({ canvas, name, port }) =>
    startHosting({ canvas, name: requireString(name, 'name'), port })
  )

  handle('session:join', async ({ host, port, name }) => {
    await joinSession({
      host: requireString(host, 'host'),
      port,
      name: requireString(name, 'name')
    })
    return { joined: true as const }
  })

  handle('session:leave', async () => {
    await stopSession()
    return { left: true as const }
  })

  handle('session:canvas', ({ canvas }) => {
    shareCanvas(canvas)
    return { sent: true as const }
  })

  handle('session:cursor', ({ x, y }) => {
    shareCursor(x, y)
    return { sent: true as const }
  })

  handle('session:selection', ({ ids }) => {
    shareSelection(ids)
    return { sent: true as const }
  })

  handle('session:where', () => ({
    address: localAddress(),
    name: machineName(),
    role: sessionRole()
  }))
}
