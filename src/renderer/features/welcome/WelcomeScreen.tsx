// ── @lib ───────────────────────────────────────────────────────────────────
import { Clock, FilePlus2, FileText, FolderOpen, FolderTree, Star, Trash2 } from '@icons'
import { useEffect, useState, type ReactElement, type ReactNode } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { formatRelativeTime, tildify, truncateMiddle } from '@shared'
import type { PinnedFile, RecentFile, RecentWorkspace } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { workspaceService } from '@services'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, EmptyState, IconButton, SectionHeading } from '@ui'

// ── @components ────────────────────────────────────────────────────────────
import { Logo } from '@components'

// ── @features ──────────────────────────────────────────────────────────────
import { newDocument, openFromDialog } from '@features/documents'
import { openRecentDocument, openWorkspace, openWorkspaceFromDialog } from '@features/explorer'

// ── types ──────────────────────────────────────────────────────────────────
import type { WelcomeScreenProps } from './types'

/**
 * The start screen.
 *
 * Shown whenever no document is open — including after the last tab is closed,
 * so the application never presents a blank void.
 */
export function WelcomeScreen({ homePath }: WelcomeScreenProps): ReactElement {
  const t = useT()

  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>([])
  const [pins, setPins] = useState<PinnedFile[]>([])

  useEffect(() => {
    void workspaceService.recentFiles().then(setRecentFiles)
    void workspaceService.recentWorkspaces().then(setRecentWorkspaces)
    void workspaceService.pins().then(setPins)
  }, [])

  const hasAnything = recentFiles.length > 0 || recentWorkspaces.length > 0 || pins.length > 0

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto bg-surface">
      <div className="flex w-full max-w-[940px] flex-col gap-10 px-6 pt-14 pb-10">
        <header className="flex flex-col items-center gap-2 text-center">
          <Logo size="xl" className="mb-1.5" />

          <h1 className="text-2xl font-bold tracking-[-0.025em] text-ink">{t('app.name')}</h1>
          <p className="max-w-[46ch] text-base leading-relaxed text-ink-secondary">
            {t('app.tagline')}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button
              variant="primary"
              size="lg"
              icon={<FilePlus2 size={15} />}
              onClick={() => newDocument()}
            >
              {t('welcome.newDocument')}
            </Button>
            <Button size="lg" icon={<FileText size={15} />} onClick={() => void openFromDialog()}>
              {t('welcome.openFile')}
            </Button>
            <Button
              size="lg"
              icon={<FolderOpen size={15} />}
              onClick={() => void openWorkspaceFromDialog()}
            >
              {t('welcome.openFolder')}
            </Button>
          </div>
        </header>

        {hasAnything ? (
          <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(268px,1fr))]">
            {pins.length > 0 ? (
              <section className="min-w-0">
                <SectionHeading>
                  <span className="inline-flex items-center gap-1.5">
                    <Star size={12} /> {t('recent.pinned')}
                  </span>
                </SectionHeading>

                <ul className="flex flex-col gap-px">
                  {pins.map((pin) => (
                    <li key={pin.path}>
                      <Entry
                        icon={<FileText size={14} className="flex-none text-ink-tertiary" />}
                        name={pin.name}
                        detail={truncateMiddle(tildify(pin.directory, homePath), 46)}
                        onOpen={() => void openRecentDocument(pin.path)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {recentFiles.length > 0 ? (
              <section className="min-w-0">
                <SectionHeading
                  actions={
                    <IconButton
                      icon={<Trash2 size={13} />}
                      label={t('recent.clearDocuments')}
                      size="sm"
                      onClick={() => void workspaceService.clearRecentFiles().then(setRecentFiles)}
                    />
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={12} /> {t('recent.documents')}
                  </span>
                </SectionHeading>

                <ul className="flex flex-col gap-px">
                  {recentFiles.slice(0, 8).map((file) => (
                    <li key={file.path} className="group flex min-w-0 items-center gap-px">
                      <Entry
                        icon={<FileText size={14} className="flex-none text-ink-tertiary" />}
                        name={file.name}
                        detail={truncateMiddle(tildify(file.directory, homePath), 46)}
                        meta={formatRelativeTime(file.openedAt)}
                        onOpen={() => void openRecentDocument(file.path)}
                      />
                      <span className="flex-none opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <IconButton
                          icon={<Trash2 size={12} />}
                          label={t('recent.removeFromRecent', { name: file.name })}
                          size="sm"
                          onClick={() =>
                            void workspaceService.removeRecentFile(file.path).then(setRecentFiles)
                          }
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {recentWorkspaces.length > 0 ? (
              <section className="min-w-0">
                <SectionHeading>
                  <span className="inline-flex items-center gap-1.5">
                    <FolderTree size={12} /> {t('recent.folders')}
                  </span>
                </SectionHeading>

                <ul className="flex flex-col gap-px">
                  {recentWorkspaces.slice(0, 6).map((workspace) => (
                    <li key={workspace.path}>
                      <Entry
                        icon={<FolderOpen size={14} className="flex-none text-ink-tertiary" />}
                        name={workspace.name}
                        detail={truncateMiddle(tildify(workspace.path, homePath), 46)}
                        onOpen={() => void openWorkspace(workspace.path)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={<FileText size={18} />}
            title={t('welcome.emptyTitle')}
            description={t('welcome.emptyDescription')}
            className="mt-4"
          />
        )}
      </div>
    </div>
  )
}

function Entry({
  icon,
  name,
  detail,
  meta,
  onOpen
}: {
  icon: ReactNode
  name: string
  detail: string
  meta?: string
  onOpen: () => void
}): ReactElement {
  return (
    <button
      type="button"
      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-hover focus-visible:shadow-focus focus-visible:outline-none"
      onClick={onOpen}
    >
      {icon}
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-sm text-ink">{name}</span>
        <span className="truncate text-2xs text-ink-tertiary">{detail}</span>
      </span>
      {meta ? <span className="flex-none text-2xs whitespace-nowrap text-ink-tertiary">{meta}</span> : null}
    </button>
  )
}
