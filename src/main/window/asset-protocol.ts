// ── node: ──────────────────────────────────────────────────────────────────
import { pathToFileURL } from 'node:url'

// ── electron ───────────────────────────────────────────────────────────────
import { net, protocol } from 'electron'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

/**
 * Local images referenced by a document cannot be loaded as `file://` from the
 * renderer — that would mean disabling `webSecurity`, which is exactly the kind
 * of blanket hole this architecture avoids.
 *
 * Instead we serve them over a private scheme whose handler runs in main and
 * re-checks every request against the same path guard the IPC layer uses. A
 * document can therefore display `./images/diagram.png`, and nothing else.
 */
export const ASSET_SCHEME = 'mcfile'

export function registerAssetSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: false
      }
    }
  ])
}

/** Builds the URL the renderer should use for an absolute local path. */
export function assetUrl(absolutePath: string): string {
  return `${ASSET_SCHEME}://asset/?p=${encodeURIComponent(absolutePath)}`
}

export function registerAssetProtocol(): void {
  protocol.handle(ASSET_SCHEME, async (request) => {
    let target: string | null

    try {
      target = new URL(request.url).searchParams.get('p')
    } catch {
      return new Response('Bad request', { status: 400 })
    }

    if (!target) return new Response('Missing path', { status: 400 })

    if (!(await pathGuard.isAllowed(target))) {
      logger.warn(`asset-protocol: blocked ${target}`)
      return new Response('Forbidden', { status: 403 })
    }

    try {
      return await net.fetch(pathToFileURL(target).toString())
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
