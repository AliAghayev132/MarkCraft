// ── node ───────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { app, safeStorage } from 'electron'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

/**
 * API keys, encrypted at rest and never handed to the renderer.
 *
 * They are kept out of `settings.json` on purpose. That file is a document the
 * user is invited to open — Settings → Files → "Show settings file" — and it is
 * the obvious thing to copy between machines or paste into a bug report. A
 * credential does not belong in it.
 *
 * `safeStorage` binds the ciphertext to the OS account (DPAPI on Windows, the
 * Keychain on macOS, the desktop keyring on Linux), so copying the file to
 * another machine yields nothing. Where the platform cannot encrypt, the key is
 * refused rather than written in the clear: silently downgrading the promise is
 * worse than not making it.
 */
const FILE = 'ai-keys.json'

type KeyFile = Record<string, string>

function filePath(): string {
  return join(app.getPath('userData'), FILE)
}

function read(): KeyFile {
  const path = filePath()
  if (!existsSync(path)) return {}

  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const out: KeyFile = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') out[id] = value
    }
    return out
  } catch (error) {
    logger.warn('ai: key store unreadable, starting empty', error)
    return {}
  }
}

function write(data: KeyFile): void {
  const path = filePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 })
}

export const aiKeys = {
  available(): boolean {
    return safeStorage.isEncryptionAvailable()
  },

  set(profileId: string, key: string): void {
    const data = read()

    // A key that is only whitespace is stored as nothing. Otherwise it survives
    // as a truthy string, sails past every "is there a key?" check, and is sent
    // as `Authorization: Bearer ` — which providers report as a *missing*
    // header, sending the user looking for a bug that is not there.
    key = key.trim()

    if (key === '') {
      delete data[profileId]
      write(data)
      return
    }

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('This system cannot store the key securely, so it was not saved.')
    }

    data[profileId] = safeStorage.encryptString(key).toString('base64')
    write(data)
  },

  get(profileId: string): string | null {
    const stored = read()[profileId]
    if (!stored) return null

    try {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'))
    } catch (error) {
      // A key encrypted under a different OS account, or a corrupt file.
      logger.warn(`ai: cannot decrypt the key for ${profileId}`, error)
      return null
    }
  },

  has(profileId: string): boolean {
    return Boolean(read()[profileId])
  },

  remove(profileId: string): void {
    const data = read()
    delete data[profileId]
    write(data)
  },

  /** Drops keys whose profile no longer exists, so deleting a profile forgets it. */
  prune(keepIds: readonly string[]): void {
    const data = read()
    const keep = new Set(keepIds)
    let changed = false

    for (const id of Object.keys(data)) {
      if (!keep.has(id)) {
        delete data[id]
        changed = true
      }
    }

    if (changed) write(data)
  }
}
