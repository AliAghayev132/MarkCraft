/** Setting a passphrase, or being asked for one that already exists. */
export type PassphraseMode = 'lock' | 'unlock'

export interface PassphraseRequest {
  mode: PassphraseMode
  /** The document's name, so the dialog says which one it is asking about. */
  name: string
  /** Stored in the clear in the file, and shown when unlocking. */
  hint?: string
  /** Set after a wrong passphrase, so the dialog can say so. */
  failed?: boolean
}

export interface PassphrasePrompt extends PassphraseRequest {
  settle: (passphrase: string | null) => void
}
