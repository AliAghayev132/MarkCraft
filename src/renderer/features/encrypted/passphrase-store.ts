// ── types ──────────────────────────────────────────────────────────────────
import type { PassphrasePrompt, PassphraseRequest } from './types'

/**
 * The passphrase dialog, and the passphrases this session is holding.
 *
 * Deliberately not in Redux. A store is inspectable, serialisable, logged by
 * every devtool and dumped into every bug report — which is the opposite of
 * what a passphrase needs. These live in a module-scoped map that goes away
 * with the window and is never written anywhere.
 *
 * The map is keyed by the file's path rather than by a document id: a file is
 * unlocked before it becomes a document, so at that moment there is no id to
 * key it by — and a locked document always has a path, or there would be
 * nothing to lock.
 */
const listeners = new Set<() => void>()
let prompt: PassphrasePrompt | null = null

const held = new Map<string, string>()

function emit(): void {
  for (const listener of listeners) listener()
}

export const passphrasePrompt = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get(): PassphrasePrompt | null {
    return prompt
  },
  /** Resolves with the passphrase, or null if the user backed out. */
  ask(request: PassphraseRequest): Promise<string | null> {
    // A second prompt would stack two dialogs asking the same question; the
    // one already on screen is the one the user is looking at.
    if (prompt) return Promise.resolve(null)

    return new Promise((resolve) => {
      prompt = {
        ...request,
        settle: (passphrase) => {
          prompt = null
          emit()
          resolve(passphrase)
        }
      }
      emit()
    })
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * What this session is holding
 * ─────────────────────────────────────────────────────────────────────────── */

export function rememberPassphrase(path: string, passphrase: string): void {
  held.set(path, passphrase)
}

export function heldPassphrase(path: string): string | undefined {
  return held.get(path)
}

export function forgetPassphrase(path: string): void {
  held.delete(path)
}

/** Everything, for locking the application or signing out of a workspace. */
export function forgetAllPassphrases(): void {
  held.clear()
}

export function isHolding(path: string): boolean {
  return held.has(path)
}
