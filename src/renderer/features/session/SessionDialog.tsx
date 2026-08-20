// ── @lib ───────────────────────────────────────────────────────────────────
import { Copy, LogIn, Radio, Users, Wifi } from '@icons'
import { useEffect, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { canvasColorCss, SESSION_DEFAULT_PORT } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { clipboardService, sessionService, toast } from '@services'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, IconButton, Input, Modal, ModalActions } from '@ui'

// ── ./session ──────────────────────────────────────────────────────────────
import { hostCanvas, joinCanvas, leaveSession } from './session-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { SessionDialogProps } from './types'

/**
 * Starting or joining a shared canvas.
 *
 * Says what it is: the local network, no service, no account. That is not a
 * disclaimer, it is the thing a person needs to know before they invite someone
 * — whether it will work depends entirely on whether the other person can reach
 * this machine, and no interface can hide that.
 */
export function SessionDialog({
  open,
  onClose,
  canvas,
  path,
  state
}: SessionDialogProps): ReactElement | null {
  const t = useT()

  const [address, setAddress] = useState('')
  const [me, setMe] = useState<{ address: string; name: string } | null>(null)

  useEffect(() => {
    if (!open) return
    void sessionService
      .where()
      .then((where) => setMe({ address: where.address, name: where.name }))
      .catch(() => setMe(null))
  }, [open])

  if (!open) return null

  const sharing = state.role !== 'off'

  return (
    <Modal
      open
      onClose={onClose}
      title={t('session.title')}
      description={t('session.body')}
      icon={<Users size={16} />}
      size="sm"
      footer={
        <ModalActions
          aside={
            <span className="flex items-center gap-1.5">
              <Wifi size={12} className="flex-none" />
              {t('session.localOnly')}
            </span>
          }
        >
          {sharing ? (
            <Button variant="dangerGhost" onClick={() => void leaveSession()}>
              {t('session.leave')}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-4">
        {state.role === 'hosting' ? (
          <section className="flex flex-col gap-2 rounded-lg border border-line-subtle bg-sunken p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <Radio size={13} className="flex-none text-success" />
              {t('session.hosting')}
            </span>
            <p className="text-xs text-ink-secondary">{t('session.tellThem')}</p>

            <span className="flex items-center gap-1.5">
              <Input
                readOnly
                monospace
                size="sm"
                value={state.address ?? ''}
                aria-label={t('session.address')}
                onFocus={(event) => event.currentTarget.select()}
              />
              <IconButton
                icon={<Copy size={14} />}
                label={t('common.copy')}
                onClick={() => {
                  void clipboardService.writeText(state.address ?? '')
                  toast.success(t('session.addressCopied'))
                }}
              />
            </span>
          </section>
        ) : null}

        {state.role === 'joined' ? (
          <p className="rounded-lg border border-line-subtle bg-sunken p-3 text-xs text-ink-secondary">
            {t('session.joinedBody')}
          </p>
        ) : null}

        {sharing ? (
          <section className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-secondary">
              {t('session.whoIsHere', { count: state.participants.length + 1 })}
            </span>

            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {state.participants.length === 0 ? (
                <li className="text-xs text-ink-tertiary">{t('session.nobodyYet')}</li>
              ) : null}

              {state.participants.map((participant) => (
                <li key={participant.id} className="flex items-center gap-2 text-xs text-ink">
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: canvasColorCss(participant.colour) ?? undefined }}
                    className="size-2.5 flex-none rounded-full"
                  />
                  <span className="min-w-0 truncate">{participant.name}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <>
            <section className="flex flex-col gap-2">
              <span className="text-xs font-medium text-ink-secondary">
                {t('session.startHere')}
              </span>
              <p className="text-xs text-ink-tertiary">
                {me
                  ? t('session.willBeAt', { address: `${me.address}:${SESSION_DEFAULT_PORT}` })
                  : t('session.findingAddress')}
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={<Radio size={13} />}
                onClick={() => void hostCanvas(canvas, path)}
              >
                {t('session.host')}
              </Button>
            </section>

            <section className="flex flex-col gap-2 border-t border-line-subtle pt-3">
              <span className="text-xs font-medium text-ink-secondary">{t('session.joinHere')}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  monospace
                  size="sm"
                  value={address}
                  placeholder={`192.168.1.24:${SESSION_DEFAULT_PORT}`}
                  aria-label={t('session.address')}
                  onChange={(event) => setAddress(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    if (event.key === 'Enter') void joinCanvas(address)
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<LogIn size={13} />}
                  disabled={address.trim() === ''}
                  onClick={() => void joinCanvas(address)}
                >
                  {t('session.join')}
                </Button>
              </span>
              <p className="text-xs text-ink-tertiary">{t('session.joinWarning')}</p>
            </section>
          </>
        )}

        {state.problem ? (
          <p role="alert" className="text-xs text-danger">
            {state.problem}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
