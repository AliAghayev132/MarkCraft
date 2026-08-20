// ── @lib ───────────────────────────────────────────────────────────────────
import { ExternalLink } from '@icons'
import { useMemo, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { basename, extensionOf, IMAGE_EXTENSIONS, joinPath, type CanvasNode } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { fileService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @components ────────────────────────────────────────────────────────────
import { FileIcon } from '@components'

const IMAGES = new Set<string>(IMAGE_EXTENSIONS)

/**
 * A card that points at a document in the workspace.
 *
 * An image shows the image; anything else shows its name and the icon the file
 * tree gives it, so the same file looks the same in both places. Double-click
 * opens it, which is what a double-click does to a file everywhere else in the
 * application — a single click has to stay available for selecting and
 * dragging the card itself.
 */
export function FileCard({
  node,
  onOpen
}: {
  node: CanvasNode
  onOpen: (node: CanvasNode) => void
}): ReactElement {
  const t = useT()
  const root = useAppSelector((state) => state.workspace.root)

  const relative = node.file ?? ''
  const extension = extensionOf(relative)

  /*
   * Resolved against the workspace, because that is what the format stores —
   * a canvas that recorded absolute paths would break the moment the folder
   * moved, or opened on another machine.
   */
  const absolute = useMemo(
    () => (root && relative ? joinPath(root, relative) : null),
    [root, relative]
  )

  if (IMAGES.has(extension) && absolute) {
    return (
      <button
        type="button"
        title={relative}
        aria-label={t('canvas.openFile', { name: basename(relative) })}
        onDoubleClick={() => onOpen(node)}
        className="flex h-full w-full items-center justify-center overflow-hidden rounded"
      >
        <img
          src={fileService.assetUrl(absolute)}
          alt={basename(relative)}
          draggable={false}
          className="max-h-full max-w-full object-contain"
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      title={relative}
      aria-label={t('canvas.openFile', { name: basename(relative) })}
      onDoubleClick={() => onOpen(node)}
      className="flex h-full w-full flex-col items-start gap-1.5 text-left"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <FileIcon kind="file" ext={extension} name={basename(relative)} path={absolute ?? ''} />
        <span className="min-w-0 truncate text-xs font-medium text-ink">
          {basename(relative)}
        </span>
      </span>
      <span className="min-w-0 truncate text-2xs text-ink-tertiary">{relative}</span>
    </button>
  )
}

/**
 * A card that points somewhere outside the application.
 *
 * The host is shown large and the rest small: what matters about a link on a
 * canvas is which site it goes to, and a forty-character tracking query buries
 * that under itself.
 */
export function LinkCard({
  node,
  onOpen
}: {
  node: CanvasNode
  onOpen: (node: CanvasNode) => void
}): ReactElement {
  const t = useT()
  const url = node.url ?? ''

  const host = useMemo(() => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  }, [url])

  return (
    <button
      type="button"
      title={url}
      aria-label={t('canvas.openLink', { name: host })}
      onDoubleClick={() => onOpen(node)}
      className="flex h-full w-full flex-col items-start gap-1.5 text-left"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <ExternalLink size={13} className="flex-none text-ink-tertiary" />
        <span className="min-w-0 truncate text-xs font-medium text-ink">{host}</span>
      </span>
      <span className="line-clamp-3 min-w-0 break-all text-2xs text-ink-tertiary">{url}</span>
    </button>
  )
}
