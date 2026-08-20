/**
 * The `.hmd` container — a Markdown document nobody can read without the key.
 *
 * Encryption, not hashing. A hash is one-way by design: it proves a document
 * has not changed, and it can never give the document back. What a locked note
 * needs is the opposite — to come back, and only for whoever holds the key.
 *
 * The file is JSON rather than a binary blob so it survives every channel a
 * note travels through: pasted into a chat, mailed, committed, synced by
 * something that rewrites line endings. It is self-describing for the same
 * reason `SUMMARY.md` and JSON Canvas are: a file that says what it is can be
 * opened by a reader that was not this one, and in ten years that reader may
 * be all there is.
 *
 * Everything here is shape and validation. The cryptography lives in main,
 * where Node's own implementation is — see `main/services/crypto-service.ts`.
 * None of it belongs in the renderer.
 */

// ── @shared ────────────────────────────────────────────────────────────────
export { ENCRYPTED_EXTENSION } from '../types/files'

export const ENCRYPTED_FORMAT = 'markcraft-encrypted'

export const ENCRYPTED_VERSION = 1

/**
 * scrypt, at a cost that takes a noticeable fraction of a second on a laptop.
 *
 * That fraction is the point. It is barely felt when opening one document and
 * it is what stands between a short passphrase and someone trying millions of
 * them: the same guess costs the attacker the same fraction, and there is no
 * shortcut around it. The parameters are written into the file so a document
 * encrypted at today's cost still opens when tomorrow's is higher.
 */
export const SCRYPT = { N: 1 << 17, r: 8, p: 1, keyLength: 32 } as const

export interface EncryptedDocument {
  format: typeof ENCRYPTED_FORMAT
  version: number
  /** How the key was derived from the passphrase. */
  kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string }
  /** How the document was encrypted with that key. */
  cipher: { name: 'aes-256-gcm'; iv: string; tag: string }
  ciphertext: string
  /**
   * A hint the author chose, shown when the passphrase is asked for. Optional,
   * and stored in the clear — it is a reminder, not a secret, and anyone who
   * writes their passphrase here has locked nothing.
   */
  hint?: string
}

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/

function isBase64(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && BASE64.test(value)
}

/*
 * The ciphertext, and only the ciphertext, may be empty: an empty document is
 * a real thing to lock — a note someone created, secured and has not written
 * in yet. The salt, nonce and tag are always present, so those stay strict.
 */
function isCiphertext(value: unknown): value is string {
  return typeof value === 'string' && BASE64.test(value)
}

/**
 * Whether this text is an encrypted document.
 *
 * Checked before anything is decrypted, and before the user is asked for a
 * passphrase — being prompted for a key to a file that was never encrypted is
 * a worse experience than being told it is not one.
 */
export function isEncryptedDocument(text: string): boolean {
  return parseEncrypted(text) !== null
}

/**
 * Reads the container, or null if it is not one.
 *
 * Every field is checked rather than trusted. The values here are fed straight
 * into a cipher, and a `N` of a hundred billion read out of a hostile file
 * would hang the application on a memory allocation it can never satisfy —
 * so the work factors are bounded on the way in, not on the way to scrypt.
 */
export function parseEncrypted(text: string): EncryptedDocument | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }

  if (typeof raw !== 'object' || raw === null) return null
  const candidate = raw as Partial<EncryptedDocument>

  if (candidate.format !== ENCRYPTED_FORMAT) return null
  if (typeof candidate.version !== 'number' || candidate.version > ENCRYPTED_VERSION) return null

  const kdf = candidate.kdf
  if (
    typeof kdf !== 'object' ||
    kdf === null ||
    kdf.name !== 'scrypt' ||
    !isBase64(kdf.salt) ||
    !isWorkFactor(kdf.N, 1 << 14, 1 << 20) ||
    !isWorkFactor(kdf.r, 1, 32) ||
    !isWorkFactor(kdf.p, 1, 16)
  ) {
    return null
  }

  const cipher = candidate.cipher
  if (
    typeof cipher !== 'object' ||
    cipher === null ||
    cipher.name !== 'aes-256-gcm' ||
    !isBase64(cipher.iv) ||
    !isBase64(cipher.tag)
  ) {
    return null
  }

  if (!isCiphertext(candidate.ciphertext)) return null

  return {
    format: ENCRYPTED_FORMAT,
    version: candidate.version,
    kdf: { name: 'scrypt', N: kdf.N, r: kdf.r, p: kdf.p, salt: kdf.salt },
    cipher: { name: 'aes-256-gcm', iv: cipher.iv, tag: cipher.tag },
    ciphertext: candidate.ciphertext,
    ...(typeof candidate.hint === 'string' && candidate.hint !== ''
      ? { hint: candidate.hint.slice(0, 200) }
      : {})
  }
}

function isWorkFactor(value: unknown, low: number, high: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high
}

/** Written with stable key order, so re-saving an unchanged file is no diff. */
export function serialiseEncrypted(document: EncryptedDocument): string {
  return `${JSON.stringify(
    {
      format: document.format,
      version: document.version,
      kdf: document.kdf,
      cipher: document.cipher,
      ...(document.hint ? { hint: document.hint } : {}),
      ciphertext: document.ciphertext
    },
    null,
    2
  )}\n`
}

/* ────────────────────────────────────────────────────────────────────────────
 * Passphrase strength
 * ─────────────────────────────────────────────────────────────────────────── */

export type PassphraseVerdict = 'empty' | 'weak' | 'fair' | 'strong'

/**
 * How much guessing a passphrase would take, in round numbers.
 *
 * Deliberately crude — a precise entropy estimate would be a dictionary and a
 * dependency, and the honest advice it produces is the same as this one gives:
 * length beats cleverness. The verdict is shown, never enforced. Refusing to
 * lock a document because the passphrase is short leaves the document
 * unlocked, which is worse than any passphrase.
 */
export function ratePassphrase(passphrase: string): PassphraseVerdict {
  if (passphrase.length === 0) return 'empty'

  const classes =
    Number(/[a-z]/.test(passphrase)) +
    Number(/[A-Z]/.test(passphrase)) +
    Number(/[0-9]/.test(passphrase)) +
    Number(/[^a-zA-Z0-9]/.test(passphrase))

  // A long passphrase of plain words is stronger than a short scramble, and
  // people actually remember it — so length is what carries the top verdict.
  if (passphrase.length >= 20) return 'strong'
  if (passphrase.length >= 12 && classes >= 2) return 'strong'
  if (passphrase.length >= 10) return 'fair'
  if (passphrase.length >= 8 && classes >= 3) return 'fair'

  return 'weak'
}
