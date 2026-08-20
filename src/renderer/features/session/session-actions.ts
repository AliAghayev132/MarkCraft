// ── @shared ────────────────────────────────────────────────────────────────
import { basename, parseAddress, type CanvasData } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { sessionService, toast } from '@services'

// ── ./session ──────────────────────────────────────────────────────────────
import { sessionState, setSelfId } from './session-store'

/**
 * Starting, joining and leaving a shared canvas.
 *
 * Every one of these reports to the person doing it. A session that silently
 * fails to start looks exactly like one that started and nobody joined, and
 * those need completely different things done about them.
 */
export async function hostCanvas(canvas: CanvasData, path: string): Promise<void> {
  try {
    const where = await sessionService.where()
    const { address } = await sessionService.host(canvas, basename(path))

    setSelfId('host')
    sessionState.hosting(address)
    toast.success(t('session.hosting'), t('session.hostingDetail', { address, name: where.name }))
  } catch (error) {
    sessionState.off(error instanceof Error ? error.message : String(error))
    toast.error(t('session.hostFailed'), error instanceof Error ? error.message : String(error))
  }
}

export async function joinCanvas(input: string): Promise<boolean> {
  const address = parseAddress(input)
  if (!address) {
    toast.warning(t('session.badAddress'), input)
    return false
  }

  try {
    const where = await sessionService.where()
    await sessionService.join(address.host, address.port, where.name)

    sessionState.joined()
    toast.success(t('session.joined'), input)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    sessionState.off(message)
    toast.error(t('session.joinFailed'), message)
    return false
  }
}

export async function leaveSession(): Promise<void> {
  try {
    await sessionService.leave()
  } finally {
    setSelfId(null)
    sessionState.off()
  }
}
