// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { resetSettings } from '@services'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Divider, dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { whatsNew } from '@features/whatsnew'

// ── @components ────────────────────────────────────────────────────────────
import { Logo } from '@components'

// ── types ──────────────────────────────────────────────────────────────────
import type { AboutSectionProps } from './types'

export function AboutSection({ appInfo }: AboutSectionProps): ReactElement {
  const t = useT()

  const rows: [string, string][] = [
    [t('settings.about.electron'), appInfo?.electron ?? '—'],
    [t('settings.about.chromium'), appInfo?.chrome ?? '—'],
    [t('settings.about.node'), appInfo?.node ?? '—'],
    [t('settings.about.platform'), appInfo?.platform ?? '—']
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Logo size="lg" />
        <div className="flex flex-col gap-0.5">
          <h3 className="text-md font-semibold">
            {t('app.name')} {appInfo?.version ?? ''}
          </h3>
          <p className="max-w-[52ch] text-xs leading-relaxed text-ink-tertiary">
            {t('settings.about.description')}
          </p>
        </div>
      </div>

      <Button variant="secondary" size="sm" className="self-start" onClick={() => whatsNew.open()}>
        {t('whatsNew.open')}
      </Button>

      <Divider />

      <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-tertiary">{label}</dt>
            <dd className="m-0 text-ink-secondary select-text">{value}</dd>
          </div>
        ))}

        <dt className="text-ink-tertiary">{t('settings.about.dataFolder')}</dt>
        <dd className="m-0 font-mono text-2xs break-all text-ink-secondary select-text">
          {appInfo?.userDataPath ?? '—'}
        </dd>
      </dl>

      <Divider />

      <p className="max-w-[60ch] text-xs leading-relaxed text-ink-tertiary">
        {t('settings.resetAllHint')}
      </p>

      <Button
        size="sm"
        variant="dangerGhost"
        className="self-start"
        onClick={async () => {
          const confirmed = await dialogs.confirm({
            title: t('settings.resetAllTitle'),
            message: t('settings.resetAllBody'),
            confirmLabel: t('settings.resetEverything'),
            tone: 'danger'
          })
          if (confirmed) await resetSettings()
        }}
      >
        {t('settings.resetAll')}
      </Button>
    </div>
  )
}
