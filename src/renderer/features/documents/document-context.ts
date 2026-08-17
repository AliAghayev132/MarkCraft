// ── @shared ────────────────────────────────────────────────────────────────
import { isDescendantPath } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { fileService, isServiceError, toast, workspaceService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState } from '@store'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentModel } from '@store/slices/types'

/**
 * The pieces every document action needs.
 *
 * Kept apart from the actions themselves so the four action files can be read
 * one at a time: error reporting and the re-grant dance are background
 * machinery, and repeating them in each file would be worse than one import.
 */

export function reportError(error: unknown, fallbackKey: string): void {
  if (isServiceError(error)) {
    if (error.isCancellation) return
    toast.error(t(`errors.codes.${error.code}`), error.message)
    return
  }
  toast.error(t(fallbackKey), error instanceof Error ? error.message : String(error))
}

export function defaultViewMode(): DocumentModel['viewMode'] {
  return getState().settings.values.markdown.defaultViewMode
}

/**
 * Reads a file, re-granting it first if it is only reachable because the user
 * opened it in an earlier session.
 *
 * The path guard starts empty on every launch, so a file from the recent list,
 * the pinned list or a restored tab is forbidden until something re-authorises
 * it. Main decides whether it may be — this only asks.
 *
 * The grant is requested up front for anything outside the open folder rather
 * than after a refusal. Probing works too, but it makes main log a denied
 * filesystem access for something entirely routine, which turns the one signal
 * that should mean "something is wrong" into noise on every launch.
 */
export async function readAllowingRemembered(path: string): Promise<Awaited<ReturnType<typeof fileService.read>>> {
  const { root } = getState().workspace
  if (root === null || !isDescendantPath(root, path)) {
    await workspaceService.authorizeRemembered(path)
  }

  try {
    return await fileService.read(path)
  } catch (error) {
    if (!isServiceError(error) || error.code !== 'FORBIDDEN_PATH') throw error

    const granted = await workspaceService.authorizeRemembered(path)
    if (!granted) throw error

    return fileService.read(path)
  }
}

