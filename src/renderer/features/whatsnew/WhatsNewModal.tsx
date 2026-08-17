// ── @lib ───────────────────────────────────────────────────────────────────
import { Sparkles, TrendingUp, Wrench } from '@icons'
import type { ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT, useTranslation } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Badge, Button, Modal, ModalActions } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { RELEASES } from './releases'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { ReleaseNoteKind, WhatsNewModalProps } from './types'

const KIND_ORDER: ReleaseNoteKind[] = ['new', 'improved', 'fixed']

const KIND_ICON: Record<ReleaseNoteKind, ReactElement> = {
  new: <Sparkles size={13} />,
  improved: <TrendingUp size={13} />,
  fixed: <Wrench size={13} />
}

const KIND_TONE: Record<ReleaseNoteKind, string> = {
  new: 'text-accent',
  improved: 'text-info',
  fixed: 'text-success'
}

/**
 * What changed, in as much detail as it takes to be useful.
 *
 * Grouped by what a change *is* rather than listed flat, because the three
 * groups answer different questions: "what can I do now", "what got better",
 * and "was my bug fixed". Every note carries a sentence of explanation — a
 * changelog of bare titles tells you a thing moved but not whether it matters
 * to you.
 */
export function WhatsNewModal({ open, onClose, version }: WhatsNewModalProps): ReactElement {
  const t = useT()
  const { language } = useTranslation()

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Sparkles size={18} />}
      title={t('whatsNew.title')}
      description={t('whatsNew.subtitle', { version })}
      size="lg"
      footer={
        <ModalActions>
          <Button variant="primary" onClick={onClose}>
            {t('whatsNew.dismiss')}
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-6">
        {RELEASES.map((release) => (
          <section key={release.version} className="flex flex-col gap-3">
            <header className="flex items-baseline gap-2">
              <h3 className="text-sm font-semibold text-ink">{release.version}</h3>
              <span className="text-xs text-ink-tertiary">{formatReleaseDate(release.date, language)}</span>
            </header>

            {KIND_ORDER.map((kind) => {
              const notes = release.notes.filter((note) => note.kind === kind)
              if (notes.length === 0) return null

              return (
                <div key={kind} className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={cx('flex-none', KIND_TONE[kind])}>{KIND_ICON[kind]}</span>
                    <span className="text-xs font-medium tracking-wide text-ink-secondary uppercase">
                      {t(`whatsNew.kind.${kind}`)}
                    </span>
                    <Badge>{notes.length}</Badge>
                  </div>

                  <ul className="flex flex-col gap-2 pl-5">
                    {notes.map((note) => (
                      <li key={note.id}>
                        <span className="block text-sm text-ink">
                          {t(`whatsNew.notes.${note.id}.title`)}
                        </span>
                        <span className="block text-xs leading-relaxed text-ink-secondary">
                          {t(`whatsNew.notes.${note.id}.body`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </Modal>
  )
}

/**
 * A readable date, whatever locale data the runtime happens to carry.
 *
 * Not every locale ships month names in Chromium: Azerbaijani formats
 * 2026-08-15 as "2026 M08 15", which is CLDR saying it has no pattern rather
 * than a date anyone wants to read. That fallback is recognisable, so it is
 * detected and the request is made again in a locale that does have one.
 */
function formatReleaseDate(iso: string, language: string): string {
  const options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }
  const date = new Date(iso)

  const localised = new Intl.DateTimeFormat(language, options).format(date)
  if (!/\bM\d{2}\b/.test(localised)) return localised

  return new Intl.DateTimeFormat('en-GB', options).format(date)
}
