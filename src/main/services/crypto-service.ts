// ── node: ──────────────────────────────────────────────────────────────────
import { createCipheriv, createDecipheriv, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  ENCRYPTED_FORMAT,
  ENCRYPTED_VERSION,
  SCRYPT,
  parseEncrypted,
  serialiseEncrypted,
  type EncryptedDocument
} from '@shared'

const derive = promisify(scrypt) as (
  passphrase: string | Buffer,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>

/**
 * Locking and unlocking a document.
 *
 * In main, because this is where Node's cryptography is and because the
 * renderer is sandboxed — a passphrase that never enters a page cannot be read
 * out of one. Nothing here is invented: scrypt to turn a passphrase people can
 * remember into a key, AES-256-GCM to encrypt with it. Both come from the
 * platform. Writing either by hand would be the single worst decision in this
 * codebase.
 *
 * GCM is chosen over plain CBC for one reason that matters more than speed:
 * it authenticates. A `.hmd` that has been altered by so much as a bit fails to
 * decrypt rather than quietly producing different text, so a corrupted or
 * tampered document announces itself instead of being read as if it were fine.
 */

/** scrypt needs roughly 128 · N · r bytes; the default cap is well below ours. */
function maxmemFor(N: number, r: number): number {
  return 256 * N * r
}

export class WrongPassphraseError extends Error {
  readonly code = 'WRONG_PASSPHRASE'

  constructor() {
    super('The passphrase does not open this document.')
    this.name = 'WrongPassphraseError'
  }
}

export class NotEncryptedError extends Error {
  readonly code = 'NOT_ENCRYPTED'

  constructor() {
    super('This file is not a MarkCraft encrypted document.')
    this.name = 'NotEncryptedError'
  }
}

export async function encryptDocument(
  text: string,
  passphrase: string,
  hint?: string
): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(passphrase.normalize('NFC'), salt, SCRYPT.keyLength, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: maxmemFor(SCRYPT.N, SCRYPT.r)
  })

  // 96 bits is the size GCM is defined for; anything else costs it a hashing
  // step and buys nothing. Random per document, and never reused, because a
  // repeated nonce under the same key is what breaks GCM outright — which is
  // also why the salt is fresh every save, giving a fresh key every time.
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])

  const document: EncryptedDocument = {
    format: ENCRYPTED_FORMAT,
    version: ENCRYPTED_VERSION,
    kdf: { name: 'scrypt', N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, salt: salt.toString('base64') },
    cipher: {
      name: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64')
    },
    ciphertext: ciphertext.toString('base64'),
    ...(hint ? { hint: hint.slice(0, 200) } : {})
  }

  return serialiseEncrypted(document)
}

export async function decryptDocument(json: string, passphrase: string): Promise<string> {
  const document = parseEncrypted(json)
  if (!document) throw new NotEncryptedError()

  const key = await derive(
    passphrase.normalize('NFC'),
    Buffer.from(document.kdf.salt, 'base64'),
    SCRYPT.keyLength,
    {
      N: document.kdf.N,
      r: document.kdf.r,
      p: document.kdf.p,
      maxmem: maxmemFor(document.kdf.N, document.kdf.r)
    }
  )

  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(document.cipher.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(document.cipher.tag, 'base64'))

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(document.ciphertext, 'base64')),
      decipher.final()
    ]).toString('utf8')
  } catch {
    /*
     * `final()` throws when the tag does not match, which is both "the
     * passphrase is wrong" and "the file has been altered" — the same failure,
     * deliberately. Distinguishing them would tell an attacker which of their
     * guesses were closer, and there is nothing the user can do differently
     * for one than the other.
     */
    throw new WrongPassphraseError()
  }
}

/**
 * A key nobody has to remember, for someone who would rather keep a file than
 * a passphrase.
 *
 * 256 bits from the system's own source, written as words separated by dashes
 * so it can be read aloud, typed from paper, and checked for a transcription
 * slip. Base32 without the characters that are read wrongly by eye — no 0/O,
 * no 1/I.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateKey(): string {
  const bytes = randomBytes(40)
  const groups: string[] = []

  for (let at = 0; at < 40; at += 5) {
    let group = ''
    for (let offset = 0; offset < 5; offset++) group += ALPHABET[bytes[at + offset] % 32]
    groups.push(group)
  }

  return groups.join('-')
}

/** Constant-time comparison, for confirming a passphrase against itself. */
export function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a.normalize('NFC'), 'utf8')
  const right = Buffer.from(b.normalize('NFC'), 'utf8')

  // Length is not secret here — both strings were typed by the same person in
  // the same dialog — but the contents are compared in constant time anyway,
  // because the habit is what keeps the next comparison safe.
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
