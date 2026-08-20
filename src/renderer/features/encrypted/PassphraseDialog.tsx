// ── @lib ───────────────────────────────────────────────────────────────────
import { Download, Eye, EyeOff, KeyRound, Lock, RefreshCw, Unlock } from '@icons'
import { useEffect, useState, useSyncExternalStore, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { ratePassphrase, type PassphraseVerdict } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { cryptoService, toast } from '@services'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, IconButton, Input, Modal, ModalActions } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── ./encrypted ────────────────────────────────────────────────────────────
import { saveKeyToFile } from './encrypted-actions'
import { passphrasePrompt } from './passphrase-store'

const VERDICT_TONE: Record<PassphraseVerdict, string> = {
  empty: 'text-ink-tertiary',
  weak: 'text-danger',
  fair: 'text-warning',
  strong: 'text-success'
}

/**
 * Asking for the key to a document.
 *
 * Two jobs in one dialog because they are two halves of the same idea: setting
 * the passphrase when a document is locked, and giving it when one is opened.
 * Splitting them would have duplicated the field, the reveal button and every
 * rule about what may be typed into them.
 *
 * Nothing here is remembered anywhere the dialog can see. The passphrase goes
 * to `settle` and out of the component with it.
 */
export function PassphraseDialog(): ReactElement | null {
  const t = useT()

  const prompt = useSyncExternalStore(
    (listener) => passphrasePrompt.subscribe(listener),
    () => passphrasePrompt.get()
  )

  const [passphrase, setPassphrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [generated, setGenerated] = useState<string | null>(null)

  // A new prompt starts empty. Carrying the last one's text across would put a
  // passphrase into a dialog asking about a different document.
  useEffect(() => {
    setPassphrase('')
    setConfirmation('')
    setRevealed(false)
    setGenerated(null)
  }, [prompt])

  if (!prompt) return null

  const locking = prompt.mode === 'lock'
  const verdict = ratePassphrase(passphrase)
  const mismatch = locking && confirmation !== '' && confirmation !== passphrase
  const ready = passphrase !== '' && (!locking || confirmation === passphrase)

  const generate = async (): Promise<void> => {
    const key = await cryptoService.generateKey()
    setPassphrase(key)
    setConfirmation(key)
    setGenerated(key)
    // Shown, because a key nobody can read is a key nobody can write down.
    setRevealed(true)
  }

  const submit = (event: { preventDefault: () => void }): void => {
    event.preventDefault()
    if (!ready) return

    if (locking && generated !== null && generated === passphrase) {
      // Said once, plainly, at the only moment it can still be acted on.
      toast.warning(t('encrypted.rememberKey'), t('encrypted.rememberKeyDetail'))
    }
    prompt.settle(passphrase)
  }

  return (
    <Modal
      open
      onClose={() => prompt.settle(null)}
      title={locking ? t('encrypted.lockTitle') : t('encrypted.unlockTitle')}
      description={
        locking
          ? t('encrypted.lockBody', { name: prompt.name })
          : t('encrypted.unlockBody', { name: prompt.name })
      }
      icon={locking ? <Lock size={16} /> : <Unlock size={16} />}
      size="sm"
      footer={
        <ModalActions
          aside={
            locking ? (
              <span className="flex items-center gap-1.5">
                <KeyRound size={12} className="flex-none" />
                {t('encrypted.noRecovery')}
              </span>
            ) : undefined
          }
        >
          <Button variant="ghost" onClick={() => prompt.settle(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={!ready} onClick={submit}>
            {locking ? t('encrypted.lockAction') : t('encrypted.unlockAction')}
          </Button>
        </ModalActions>
      }
    >
      <form className="flex flex-col gap-3" onSubmit={submit}>
        {prompt.hint ? (
          <p className="rounded-md border border-line-subtle bg-sunken px-2.5 py-1.5 text-xs text-ink-secondary">
            <span className="text-ink-tertiary">{t('encrypted.hintLabel')}: </span>
            {prompt.hint}
          </p>
        ) : null}

        {prompt.failed ? (
          <p role="alert" className="text-xs text-danger">
            {t('encrypted.wrongPassphrase')}
          </p>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-secondary">
            {t('encrypted.passphrase')}
          </span>
          <Input
            // The dialog exists to be typed into; anything else to focus first
            // would be a step between the user and the only field on screen.
            autoFocus
            type={revealed ? 'text' : 'password'}
            value={passphrase}
            monospace={revealed}
            spellCheck={false}
            autoComplete="off"
            aria-label={t('encrypted.passphrase')}
            onChange={(event) => setPassphrase(event.currentTarget.value)}
            suffix={
              <IconButton
                icon={revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                label={revealed ? t('encrypted.hide') : t('encrypted.reveal')}
                size="sm"
                onClick={() => setRevealed((on) => !on)}
              />
            }
          />
        </label>

        {locking ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-secondary">
                {t('encrypted.confirm')}
              </span>
              <Input
                type={revealed ? 'text' : 'password'}
                value={confirmation}
                monospace={revealed}
                spellCheck={false}
                autoComplete="off"
                invalid={mismatch}
                aria-label={t('encrypted.confirm')}
                onChange={(event) => setConfirmation(event.currentTarget.value)}
              />
              {mismatch ? (
                <span className="text-xs text-danger">{t('encrypted.mismatch')}</span>
              ) : null}
            </label>

            <p className={cx('text-xs', VERDICT_TONE[verdict])}>
              {verdict === 'empty' ? t('encrypted.lengthAdvice') : t(`encrypted.verdict.${verdict}`)}
            </p>

            <div className="flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3">
              <Button
                size="sm"
                variant="secondary"
                icon={<RefreshCw size={13} />}
                onClick={() => void generate()}
              >
                {t('encrypted.generate')}
              </Button>

              {/*
               * Only after one has been generated. Offering to save a
               * passphrase the user invented and already knows is an invitation
               * to leave it in a text file for no benefit.
               */}
              {generated ? (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Download size={13} />}
                  onClick={() => void saveKeyToFile(generated, prompt.name)}
                >
                  {t('encrypted.saveKey')}
                </Button>
              ) : null}
            </div>

            {generated ? (
              <p className="text-xs text-warning">{t('encrypted.keyFileWarning')}</p>
            ) : null}
          </>
        ) : null}
      </form>
    </Modal>
  )
}
