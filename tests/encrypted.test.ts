import { describe, expect, it } from 'vitest'

import {
  decryptDocument,
  encryptDocument,
  generateKey,
  NotEncryptedError,
  sameSecret,
  WrongPassphraseError
} from '@main/services/crypto-service'

import {
  ENCRYPTED_FORMAT,
  isEncryptedDocument,
  parseEncrypted,
  ratePassphrase,
  serialiseEncrypted,
  type EncryptedDocument
} from '@shared'

/**
 * The `.hmd` container.
 *
 * Tested harder than anything else here for two reasons. A mistake that leaks
 * is invisible — the file still opens, and nothing tells you the lock was
 * never shut. A mistake that loses is permanent: an encrypted note that cannot
 * be decrypted is not a bug report, it is a note that is gone.
 *
 * The cost parameters make each derivation take a noticeable fraction of a
 * second, which is the whole point of scrypt; a handful of round trips is
 * therefore the right number for a suite that has to stay quick.
 */

const PASSPHRASE = 'correct horse battery staple'

describe('locking and unlocking', () => {
  it('gives the document back exactly', async () => {
    const text = '# Notes\n\nSomething private.\n'
    const locked = await encryptDocument(text, PASSPHRASE)

    expect(await decryptDocument(locked, PASSPHRASE)).toBe(text)
  })

  it('leaves nothing of the document in the file', async () => {
    const locked = await encryptDocument('the treasure is under the oak', PASSPHRASE)

    expect(locked).not.toContain('treasure')
    expect(locked).not.toContain('oak')
    // Nor the key to it.
    expect(locked).not.toContain(PASSPHRASE)
    expect(locked).not.toContain('battery')
  })

  it('refuses the wrong passphrase rather than returning nonsense', async () => {
    const locked = await encryptDocument('secret', PASSPHRASE)

    await expect(decryptDocument(locked, 'wrong passphrase entirely')).rejects.toBeInstanceOf(
      WrongPassphraseError
    )
  })

  it('refuses a passphrase that differs by one character', async () => {
    const locked = await encryptDocument('secret', PASSPHRASE)

    await expect(decryptDocument(locked, `${PASSPHRASE} `)).rejects.toBeInstanceOf(
      WrongPassphraseError
    )
  })

  it('notices a document that has been altered', async () => {
    // The reason for GCM rather than a cipher with no authentication: a
    // tampered file must fail, not quietly decrypt to different text.
    const locked = JSON.parse(await encryptDocument('secret', PASSPHRASE)) as EncryptedDocument
    const bytes = Buffer.from(locked.ciphertext, 'base64')
    bytes[0] ^= 1
    locked.ciphertext = bytes.toString('base64')

    await expect(
      decryptDocument(serialiseEncrypted(locked), PASSPHRASE)
    ).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('notices a swapped authentication tag', async () => {
    const locked = JSON.parse(await encryptDocument('secret', PASSPHRASE)) as EncryptedDocument
    const other = JSON.parse(await encryptDocument('secret', PASSPHRASE)) as EncryptedDocument
    locked.cipher.tag = other.cipher.tag

    await expect(
      decryptDocument(serialiseEncrypted(locked), PASSPHRASE)
    ).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('never writes the same file twice for the same input', async () => {
    // A fresh salt and nonce every save. Identical output would leak that two
    // documents are the same, and a reused nonce breaks GCM outright.
    const first = JSON.parse(await encryptDocument('same', PASSPHRASE)) as EncryptedDocument
    const second = JSON.parse(await encryptDocument('same', PASSPHRASE)) as EncryptedDocument

    expect(first.kdf.salt).not.toBe(second.kdf.salt)
    expect(first.cipher.iv).not.toBe(second.cipher.iv)
    expect(first.ciphertext).not.toBe(second.ciphertext)
  })

  it('handles an empty document', async () => {
    expect(await decryptDocument(await encryptDocument('', PASSPHRASE), PASSPHRASE)).toBe('')
  })

  it('handles text no ASCII assumption survives', async () => {
    const text = '# Qeyd\n\nSalam — «дневник» 🔐 日本語\ttab\r\nCRLF\n'
    const locked = await encryptDocument(text, PASSPHRASE)

    expect(await decryptDocument(locked, PASSPHRASE)).toBe(text)
  })

  it('treats the same passphrase written two Unicode ways as the same', async () => {
    // "é" as one code point and as e + combining accent look identical on
    // screen, and a keyboard may produce either. Refusing the second would
    // lock someone out of their own note for a difference they cannot see.
    const locked = await encryptDocument('secret', 'café')
    expect(await decryptDocument(locked, 'café')).toBe('secret')
  })

  it('says plainly when the file is not one of ours', async () => {
    await expect(decryptDocument('# Just Markdown', PASSPHRASE)).rejects.toBeInstanceOf(
      NotEncryptedError
    )
  })
})

describe('the container', () => {
  it('recognises its own files', async () => {
    expect(isEncryptedDocument(await encryptDocument('x', PASSPHRASE))).toBe(true)
  })

  it('does not mistake anything else for one', () => {
    for (const text of [
      '# Markdown',
      '',
      'not json at all',
      '{}',
      '[]',
      'null',
      JSON.stringify({ format: 'something-else' }),
      JSON.stringify({ nodes: [], edges: [] })
    ]) {
      expect(isEncryptedDocument(text)).toBe(false)
    }
  })

  it('refuses a work factor that would hang the application', () => {
    // Straight out of a hostile file and into a memory allocation, if it were
    // not bounded here.
    const hostile = JSON.stringify({
      format: ENCRYPTED_FORMAT,
      version: 1,
      kdf: { name: 'scrypt', N: 2 ** 40, r: 8, p: 1, salt: 'AAAA' },
      cipher: { name: 'aes-256-gcm', iv: 'AAAA', tag: 'AAAA' },
      ciphertext: 'AAAA'
    })

    expect(parseEncrypted(hostile)).toBeNull()
  })

  it('refuses a work factor below anything worth doing', () => {
    const feeble = JSON.stringify({
      format: ENCRYPTED_FORMAT,
      version: 1,
      kdf: { name: 'scrypt', N: 2, r: 8, p: 1, salt: 'AAAA' },
      cipher: { name: 'aes-256-gcm', iv: 'AAAA', tag: 'AAAA' },
      ciphertext: 'AAAA'
    })

    expect(parseEncrypted(feeble)).toBeNull()
  })

  it('refuses a cipher it does not implement', () => {
    const swapped = JSON.stringify({
      format: ENCRYPTED_FORMAT,
      version: 1,
      kdf: { name: 'scrypt', N: 1 << 17, r: 8, p: 1, salt: 'AAAA' },
      cipher: { name: 'aes-128-ecb', iv: 'AAAA', tag: 'AAAA' },
      ciphertext: 'AAAA'
    })

    expect(parseEncrypted(swapped)).toBeNull()
  })

  it('refuses a version from the future it cannot understand', () => {
    const ahead = JSON.stringify({
      format: ENCRYPTED_FORMAT,
      version: 99,
      kdf: { name: 'scrypt', N: 1 << 17, r: 8, p: 1, salt: 'AAAA' },
      cipher: { name: 'aes-256-gcm', iv: 'AAAA', tag: 'AAAA' },
      ciphertext: 'AAAA'
    })

    expect(parseEncrypted(ahead)).toBeNull()
  })

  it('carries a hint in the clear, because that is what a hint is', async () => {
    const locked = await encryptDocument('secret', PASSPHRASE, 'the usual one')

    expect(parseEncrypted(locked)?.hint).toBe('the usual one')
    expect(await decryptDocument(locked, PASSPHRASE)).toBe('secret')
  })

  it('round-trips through parse and serialise unchanged', async () => {
    const locked = await encryptDocument('secret', PASSPHRASE, 'hint')
    const parsed = parseEncrypted(locked)

    expect(parsed).not.toBeNull()
    expect(serialiseEncrypted(parsed as EncryptedDocument)).toBe(locked)
  })
})

describe('generated keys', () => {
  it('is long enough to be worth generating', () => {
    // Eight groups of five from a 32-character alphabet: 200 bits.
    expect(generateKey()).toMatch(/^([A-Z2-9]{5}-){7}[A-Z2-9]{5}$/)
  })

  it('leaves out the characters that are misread by eye', () => {
    const keys = Array.from({ length: 40 }, () => generateKey()).join('')
    expect(keys).not.toMatch(/[01IO]/)
  })

  it('does not repeat itself', () => {
    const keys = new Set(Array.from({ length: 200 }, () => generateKey()))
    expect(keys.size).toBe(200)
  })

  it('opens a document it locked', async () => {
    const key = generateKey()
    expect(await decryptDocument(await encryptDocument('secret', key), key)).toBe('secret')
  })
})

describe('comparing a passphrase with its confirmation', () => {
  it('accepts a match', () => {
    expect(sameSecret('hunter2', 'hunter2')).toBe(true)
  })

  it('rejects a mismatch', () => {
    expect(sameSecret('hunter2', 'hunter3')).toBe(false)
    expect(sameSecret('hunter2', 'hunter22')).toBe(false)
    expect(sameSecret('', 'x')).toBe(false)
  })

  it('accepts two Unicode spellings of the same thing', () => {
    expect(sameSecret('café', 'café')).toBe(true)
  })
})

describe('rating a passphrase', () => {
  it('says what it is looking at', () => {
    expect(ratePassphrase('')).toBe('empty')
    expect(ratePassphrase('abc')).toBe('weak')
    expect(ratePassphrase('password12')).toBe('fair')
    expect(ratePassphrase('correct horse battery staple')).toBe('strong')
  })

  it('rewards length over cleverness, because that is what holds', () => {
    expect(ratePassphrase('Xy7!')).toBe('weak')
    expect(ratePassphrase('a whole sentence here')).toBe('strong')
  })
})
