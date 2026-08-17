// ── @lib ───────────────────────────────────────────────────────────────────
import { Plus } from '@icons'
import { useCallback, useEffect, useRef, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { tildify } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { clipboardService, fileService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { documentActivated, documentsReordered, isDirty, selectActiveDocumentId, selectDocumentEntities, selectDocumentOrder, useAppDispatch, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton, useContextMenu, type MenuEntry } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import {
  closeAllDocuments,
  closeDocument,
  closeOtherDocuments,
  newDocument,
  reopenClosedDocument,
  saveDocument
} from '@features/documents'
import { Tab } from './Tab'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentModel } from '@store/slices/types'
import type { TabBarProps } from './types'

export function TabBar({ homePath }: TabBarProps): ReactElement | null {
  const t = useT()
  const dispatch = useAppDispatch()

  const order = useAppSelector(selectDocumentOrder)
  const entities = useAppSelector(selectDocumentEntities)
  const activeId = useAppSelector(selectActiveDocumentId)

  const listRef = useRef<HTMLDivElement | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const showContextMenu = useContextMenu()

  // Keep the active tab visible when it is changed from the palette or a
  // shortcut rather than by clicking it.
  useEffect(() => {
    if (!activeId) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-tab-id="${activeId}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeId])

  const buildMenu = useCallback(
    (document: DocumentModel): MenuEntry[] => [
      {
        id: 'close',
        label: t('tabs.menu.close'),
        shortcut: 'mod+w',
        onSelect: () => void closeDocument(document.id)
      },
      {
        id: 'close-others',
        label: t('tabs.menu.closeOthers'),
        disabled: order.length < 2,
        onSelect: () => void closeOtherDocuments(document.id)
      },
      { id: 'close-all', label: t('tabs.menu.closeAll'), onSelect: () => void closeAllDocuments() },
      {
        id: 'reopen',
        label: t('tabs.menu.reopen'),
        shortcut: 'mod+shift+t',
        onSelect: () => void reopenClosedDocument()
      },
      { id: 'sep-1', separator: true },
      {
        id: 'save',
        label: t('tabs.menu.save'),
        shortcut: 'mod+s',
        disabled: !isDirty(document),
        onSelect: () => void saveDocument(document.id)
      },
      {
        id: 'save-as',
        label: t('tabs.menu.saveAs'),
        shortcut: 'mod+shift+s',
        onSelect: () => void saveDocument(document.id, { saveAs: true })
      },
      { id: 'sep-2', separator: true },
      {
        id: 'copy-path',
        label: t('tabs.menu.copyPath'),
        disabled: !document.path,
        onSelect: () => {
          if (!document.path) return
          void clipboardService.writeText(document.path)
          toast.success(t('notifications.pathCopied'))
        }
      },
      {
        id: 'reveal',
        label: t('tabs.menu.reveal'),
        disabled: !document.path,
        onSelect: () => {
          if (document.path) void fileService.reveal(document.path)
        }
      }
    ],
    [order.length, t]
  )

  if (order.length === 0) return null

  const activePath = activeId ? (entities[activeId]?.path ?? null) : null

  return (
    <div
      className="flex h-tabbar flex-none items-stretch overflow-hidden border-b border-line-subtle bg-sunken"
      role="tablist"
      aria-label={t('tabs.region')}
    >
      <div
        ref={listRef}
        className="flex min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:h-0"
      >
        {order.map((id, index) => {
          const document = entities[id]
          if (!document) return null

          return (
            <Tab
              key={id}
              document={document}
              active={id === activeId}
              isDropTarget={dropIndex === index && dragIndex !== index}
              onActivate={() => dispatch(documentActivated(id))}
              onClose={() => void closeDocument(id)}
              onContextMenu={(event) => {
                dispatch(documentActivated(id))
                showContextMenu(event, buildMenu(document), t('tabs.menu.label'))
              }}
              onDragStart={(event) => {
                setDragIndex(index)
                event.dataTransfer.effectAllowed = 'move'
                // Marking the payload keeps an OS file drop distinguishable
                // from an internal tab reorder.
                event.dataTransfer.setData('application/x-markcraft-tab', id)
              }}
              onDragOver={(event) => {
                if (dragIndex === null) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setDropIndex(index)
              }}
              onDrop={(event) => {
                event.preventDefault()
                if (dragIndex !== null && dragIndex !== index) {
                  dispatch(documentsReordered({ from: dragIndex, to: index }))
                }
                setDragIndex(null)
                setDropIndex(null)
              }}
              onDragEnd={() => {
                setDragIndex(null)
                setDropIndex(null)
              }}
            />
          )
        })}
      </div>

      <div className="flex flex-none items-center gap-px px-1.5">
        <IconButton
          icon={<Plus size={15} />}
          label={t('tabs.newDocument')}
          shortcut="mod+n"
          size="sm"
          onClick={() => newDocument()}
        />
      </div>

      {activePath ? (
        <span
          className="hidden max-w-[34ch] flex-none items-center truncate border-l border-line-subtle px-3 text-2xs text-ink-tertiary min-[1100px]:flex"
          title={activePath}
        >
          {tildify(activePath, homePath)}
        </span>
      ) : null}
    </div>
  )
}
