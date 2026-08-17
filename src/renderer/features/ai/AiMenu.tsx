// ── @lib ───────────────────────────────────────────────────────────────────
import { Expand, LifeBuoy, Minimize2, Sparkles, Wand2, MessageSquareText } from '@icons'
import { useMemo } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Dropdown, IconButton } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { startAi } from './ai-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { MenuEntry } from '@ui/types'

/**
 * The assistant's entry point in the formatting toolbar.
 *
 * It renders nothing at all until a model is connected *and* switched on. An
 * editor that advertises an AI button which only ever says "configure this
 * first" is worse than one that waits until the feature exists.
 */
export function AiMenu(): React.ReactElement | null {
  const t = useT()
  const ai = useAppSelector((state) => state.settings.values.ai)

  const ready = ai.enabled && ai.profiles.some((profile) => profile.id === ai.activeProfileId)

  const items = useMemo<MenuEntry[]>(
    () => [
      {
        id: 'polish',
        label: t('ai.action.polish'),
        icon: <Wand2 size={14} />,
        onSelect: () => startAi('polish')
      },
      {
        id: 'elaborate',
        label: t('ai.action.elaborate'),
        icon: <Expand size={14} />,
        onSelect: () => startAi('elaborate')
      },
      {
        id: 'summarize',
        label: t('ai.action.summarize'),
        icon: <Minimize2 size={14} />,
        onSelect: () => startAi('summarize')
      },
      {
        id: 'review',
        label: t('ai.action.review'),
        icon: <LifeBuoy size={14} />,
        onSelect: () => startAi('review')
      },
      { id: 'sep', separator: true },
      {
        id: 'custom',
        label: t('ai.action.custom'),
        icon: <MessageSquareText size={14} />,
        onSelect: () => startAi('custom')
      }
    ],
    [t]
  )

  if (!ready) return null

  return (
    <Dropdown items={items} ariaLabel={t('ai.menu')} placement="bottom-end">
      <IconButton
        icon={<Sparkles size={16} />}
        label={t('ai.menu')}
        size="md"
        onMouseDown={(event) => {
          // Keep the selection alive — it is the thing the action operates on.
          event.preventDefault()
        }}
      />
    </Dropdown>
  )
}
