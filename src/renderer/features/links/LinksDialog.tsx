// ── @lib ───────────────────────────────────────────────────────────────────
import { AlertTriangle, FolderTree, Link2 } from '@icons'
import { useEffect, useMemo, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { backlinksOf, joinPath, relativeToRoot, type LinkGraphResult } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { linksService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectActiveDocument, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Divider, EmptyState, Modal, ModalActions, Spinner } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @features ──────────────────────────────────────────────────────────────
import { layoutGraph } from './layout'

// ── types ──────────────────────────────────────────────────────────────────
import type { LinksDialogProps } from './types'

const WIDTH = 620
const HEIGHT = 380

/**
 * How the documents in a workspace refer to each other.
 *
 * Two views of one scan, because they answer different questions: the list says
 * "who mentions the thing I am reading", which is what a writer wants while
 * writing, and the map says "what shape is this workspace", which is what they
 * want when it has grown past holding in their head.
 */
export function LinksDialog({ open, onClose, onOpenDocument }: LinksDialogProps): ReactElement {
  const t = useT()
  const document_ = useAppSelector(selectActiveDocument)
  const root = useAppSelector((state) => state.workspace.root)

  const [graph, setGraph] = useState<LinkGraphResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  /*
   * Scanned on open rather than kept live. The graph goes stale the moment a
   * link is typed, and a watcher rebuilding it on every keystroke would cost
   * far more than reopening the panel does.
   */
  useEffect(() => {
    if (!open || !root) return

    let cancelled = false
    setLoading(true)

    void linksService
      .graph(root)
      .then((result) => {
        if (!cancelled) setGraph(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, root])

  /*
   * The graph is keyed by forward-slash relative paths. This was slicing the
   * root off by hand and comparing against a forward slash, which on Windows
   * never matched what `normalizeSeparators` produces — so the backlinks list
   * was empty on Windows however many documents pointed at the open one.
   */
  const relative = useMemo(
    () => relativeToRoot(root, document_?.path ?? null),
    [document_?.path, root]
  )

  const backlinks = useMemo(
    () => (graph && relative ? backlinksOf(graph, relative) : []),
    [graph, relative]
  )

  const placed = useMemo(
    () => (graph ? layoutGraph(graph.nodes, graph.edges, { width: WIDTH, height: HEIGHT }) : []),
    [graph]
  )

  const positions = useMemo(() => new Map(placed.map((node) => [node.path, node])), [placed])

  const open_ = (relativePath: string): void => {
    if (!root) return
    onOpenDocument(joinPath(root, relativePath))
    onClose()
  }

  const connected = (path: string): boolean =>
    hovered === null ||
    hovered === path ||
    (graph?.edges.some(
      (edge) =>
        (edge.from === hovered && edge.to === path) || (edge.to === hovered && edge.from === path)
    ) ??
      false)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('links.title')}
      description={graph ? t('links.summary', { files: graph.nodes.length, links: graph.edges.length }) : undefined}
      icon={<FolderTree size={17} />}
      size="2xl"
      footer={
        <ModalActions>
          <Button variant="primary" data-autofocus onClick={onClose}>
            {t('common.done')}
          </Button>
        </ModalActions>
      }
    >
      {loading ? (
        <div className="flex h-[200px] items-center justify-center">
          <Spinner label={t('links.scanning')} />
        </div>
      ) : !graph || graph.nodes.length === 0 ? (
        <EmptyState icon={<Link2 size={22} />} title={t('links.empty')} />
      ) : (
        <div className="flex flex-col gap-3">
          {/* ── The map ─────────────────────────────────────────────────── */}
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={t('links.mapLabel')}
            className="w-full rounded-lg border border-line bg-sunken"
          >
            {graph.edges.map((edge) => {
              const from = positions.get(edge.from)
              const to = positions.get(edge.to)
              if (!from || !to) return null

              const lit = hovered === null || hovered === edge.from || hovered === edge.to

              return (
                <line
                  key={`${edge.from}->${edge.to}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={cx('stroke-ink-tertiary', lit ? 'opacity-45' : 'opacity-10')}
                  strokeWidth={1}
                />
              )
            })}

            {placed.map((node) => {
              const details = graph.nodes.find((entry) => entry.path === node.path)
              const weight = (details?.incoming ?? 0) + (details?.outgoing ?? 0)
              // Well-connected documents read as the hubs they are.
              const size = Math.min(11, 4 + weight)
              const isCurrent = node.path === relative

              return (
                <g
                  key={node.path}
                  className={cx('cursor-pointer', connected(node.path) ? '' : 'opacity-25')}
                  onMouseEnter={() => setHovered(node.path)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => open_(node.path)}
                >
                  <title>{node.path}</title>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={size}
                    className={isCurrent ? 'fill-accent' : 'fill-ink-tertiary'}
                  />
                  <text
                    x={node.x}
                    y={node.y + size + 11}
                    textAnchor="middle"
                    className="pointer-events-none fill-ink-secondary text-[9px]"
                  >
                    {details?.title ?? node.path}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* ── Backlinks for what is open ──────────────────────────────── */}
          <section className="flex flex-col gap-1.5">
            <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
              {relative ? t('links.backlinksFor', { name: relative }) : t('links.backlinks')}
            </h3>

            {backlinks.length === 0 ? (
              <p className="m-0 text-xs text-ink-tertiary">{t('links.noBacklinks')}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {backlinks.map((node) => (
                  <li key={node.path}>
                    <button
                      type="button"
                      onClick={() => open_(node.path)}
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm text-ink-secondary"
                    >
                      <Link2 size={13} className="flex-none text-ink-tertiary" />
                      {node.path}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {graph.broken.length > 0 ? (
            <>
              <Divider />
              <section className="flex flex-col gap-1.5">
                <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
                  {t('links.broken')}
                </h3>

                <ul className="m-0 flex max-h-[130px] list-none flex-col gap-1 overflow-y-auto p-0">
                  {graph.broken.slice(0, 100).map((link) => (
                    <li
                      key={`${link.from}:${link.line}:${link.target}`}
                      className="flex items-start gap-1.5 text-xs text-ink-secondary"
                    >
                      <AlertTriangle size={12} className="mt-0.5 flex-none text-warning" />
                      {t('links.brokenLine', {
                        target: link.target,
                        file: link.from,
                        line: link.line
                      })}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
