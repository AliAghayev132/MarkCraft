// ── ../services ────────────────────────────────────────────────────────────
import { decryptDocument, encryptDocument, generateKey } from '../services/crypto-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

/**
 * Locking and unlocking documents.
 *
 * No path guard, because nothing here touches the filesystem: text comes in,
 * text goes out, and whatever is done with it afterwards goes through the file
 * handlers, which do guard. Keeping the two apart is what lets the encryption
 * be tested without a disk and the writing be tested without a passphrase.
 *
 * The passphrase crosses this boundary and is never stored on either side of
 * it. It exists for the length of one call.
 */
export function registerCryptoHandlers(): void {
  handle('crypto:encrypt', ({ text, passphrase, hint }) =>
    encryptDocument(
      requireString(text, 'text'),
      requireString(passphrase, 'passphrase'),
      typeof hint === 'string' ? hint : undefined
    )
  )

  handle('crypto:decrypt', ({ json, passphrase }) =>
    decryptDocument(requireString(json, 'json'), requireString(passphrase, 'passphrase'))
  )

  handle('crypto:generateKey', () => generateKey())
}
