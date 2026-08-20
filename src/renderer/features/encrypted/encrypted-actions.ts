// ── @shared ────────────────────────────────────────────────────────────────
import { basename, ENCRYPTED_EXTENSION, extensionOf, parseEncrypted } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { cryptoService, dialogService, fileService, toast } from '@services'

// ── ./encrypted ────────────────────────────────────────────────────────────
import { heldPassphrase, passphrasePrompt, rememberPassphrase } from './passphrase-store'

/** Whether this path is a locked document, by its name alone. */
export function isEncryptedPath(path: string): boolean {
  return extensionOf(path) === ENCRYPTED_EXTENSION
}

/**
 * The text to write for a document being saved to a `.hmd` path.
 *
 * Asks for a passphrase the first time and holds it for the session, so a
 * locked document saves like any other afterwards. Returns null when the user
 * backs out of the dialog — the caller must then not write anything, because
 * writing the plaintext would be the one unrecoverable mistake here.
 */
export async function encryptForSave(path: string, content: string): Promise<string | null> {
  const existing = heldPassphrase(path)
  if (existing !== undefined) {
    return cryptoService.encrypt(content, existing)
  }

  const passphrase = await passphrasePrompt.ask({ mode: 'lock', name: basename(path) })
  if (passphrase === null) return null

  rememberPassphrase(path, passphrase)
  return cryptoService.encrypt(content, passphrase)
}

/**
 * The Markdown inside a locked file.
 *
 * Asks until the passphrase opens it or the user gives up. Returns null in the
 * second case, which the caller treats as "the document was not opened" rather
 * than as an error — backing out of a passphrase dialog is a decision, not a
 * failure.
 */
export async function decryptForOpen(path: string, json: string): Promise<string | null> {
  const document = parseEncrypted(json)
  if (!document) {
    toast.error(t('encrypted.notEncrypted'), basename(path))
    return null
  }

  const held = heldPassphrase(path)
  if (held !== undefined) {
    try {
      return await cryptoService.decrypt(json, held)
    } catch {
      // The held one no longer works — the file was re-locked elsewhere.
    }
  }

  let failed = false
  for (;;) {
    const passphrase = await passphrasePrompt.ask({
      mode: 'unlock',
      name: basename(path),
      hint: document.hint,
      failed
    })
    if (passphrase === null) return null

    try {
      const text = await cryptoService.decrypt(json, passphrase)
      rememberPassphrase(path, passphrase)
      return text
    } catch {
      failed = true
    }
  }
}

/**
 * Writes the key to a file of the user's choosing.
 *
 * Through the save dialog, never automatically beside the document: a key file
 * kept next to what it unlocks is the same as no key at all, and the only way
 * to be sure it lands somewhere else is to let the person say where.
 *
 * The file explains what it is. A key found in five years in a folder nobody
 * remembers is worth nothing if there is no way to tell what it opens.
 */
export async function saveKeyToFile(key: string, documentName: string): Promise<void> {
  const suggestion = `${documentName.replace(/\.[^.]+$/, '')}-key.txt`
  const chosen = await dialogService.saveFile(suggestion, ['txt'], null)
  if (!chosen) return

  const body = [
    t('encrypted.keyFileTitle'),
    '',
    t('encrypted.keyFileFor', { name: documentName }),
    '',
    key,
    '',
    t('encrypted.keyFileWarning'),
    t('encrypted.keyFileNoRecovery'),
    ''
  ].join('\n')

  try {
    await fileService.write({ path: chosen, content: body, eol: 'lf' })
    toast.success(t('encrypted.keySaved'), basename(chosen))
  } catch (error) {
    toast.error(
      t('encrypted.keySaveFailed'),
      error instanceof Error ? error.message : String(error)
    )
  }
}
