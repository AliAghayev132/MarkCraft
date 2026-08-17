// ── @shared ────────────────────────────────────────────────────────────────
import type { AiAction } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { aiService, onMainEvent, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { contentChanged, dispatch, getState, selectActiveDocument } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'
import { markdownToRichHtml } from '@features/editor/rich'
import { readTarget } from './ai-selection'

// ── types ──────────────────────────────────────────────────────────────────
import type { AiRunState } from './types'

/**
 * The assistant's run state, held outside React.
 *
 * Text arrives token by token from main, which would mean a store dispatch per
 * token if this lived in Redux — hundreds of actions for one rewrite, each one
 * waking every connected selector in the application. An external store with a
 * single subscriber (the dialog) keeps a streaming answer as cheap as it should
 * be, and the state is genuinely transient: nothing else needs to read it.
 */
const IDLE: AiRunState = {
  phase: 'idle',
  runId: '',
  action: 'polish',
  instruction: '',
  target: null,
  output: '',
  error: null
}

let state: AiRunState = IDLE
const listeners = new Set<() => void>()

function set(patch: Partial<AiRunState>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

export const aiRun = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get(): AiRunState {
    return state
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Availability
 * ─────────────────────────────────────────────────────────────────────────── */

/** Whether anything AI-related should be visible at all. */
export function aiReady(): boolean {
  const { ai } = getState().settings.values
  return ai.enabled && ai.profiles.some((profile) => profile.id === ai.activeProfileId)
}

export function activeProfileName(): string {
  const { ai } = getState().settings.values
  return ai.profiles.find((profile) => profile.id === ai.activeProfileId)?.name ?? ''
}

/* ────────────────────────────────────────────────────────────────────────────
 * Running
 * ─────────────────────────────────────────────────────────────────────────── */

let unsubscribeChunk: (() => void) | null = null
let unsubscribeDone: (() => void) | null = null

/**
 * Opens the assistant for one action.
 *
 * Whether it sends immediately or shows what it is about to send is the user's
 * standing choice: the text leaves the machine for a third party, so "always
 * ask" is the default and turning it off is an informed decision, not the
 * absence of one.
 */
export function startAi(action: AiAction, instruction = ''): void {
  if (!aiReady()) return

  const target = readTarget()
  if (!target || target.text.trim() === '') {
    toast.warning(t('ai.nothingToWorkOn'), t('ai.nothingToWorkOnDetail'))
    return
  }

  const confirm = getState().settings.values.ai.confirmBeforeRun || action === 'custom'

  set({
    ...IDLE,
    phase: confirm ? 'confirm' : 'streaming',
    action,
    instruction,
    target,
    runId: newRunId()
  })

  if (!confirm) void send()
}

export async function send(): Promise<void> {
  const { target, action, instruction, runId } = state
  if (!target) return

  const profileId = getState().settings.values.ai.activeProfileId
  if (!profileId) return

  set({ phase: 'streaming', output: '', error: null })
  listen(runId)

  const result = await aiService.run({ runId, profileId, action, input: target.text, instruction })
  if (!result.ok) {
    stopListening()
    set({ phase: 'error', error: result.error ?? t('ai.failed') })
  }
}

function listen(runId: string): void {
  stopListening()

  unsubscribeChunk = onMainEvent('event:aiChunk', (payload) => {
    if (payload.runId !== runId) return
    set({ output: state.output + payload.delta })
  })

  unsubscribeDone = onMainEvent('event:aiDone', (payload) => {
    if (payload.runId !== runId) return
    stopListening()

    if (payload.cancelled) {
      set({ phase: 'idle' })
      return
    }
    set(payload.error ? { phase: 'error', error: payload.error } : { phase: 'done' })
  })
}

function stopListening(): void {
  unsubscribeChunk?.()
  unsubscribeDone?.()
  unsubscribeChunk = null
  unsubscribeDone = null
}

export function cancelAi(): void {
  if (state.runId) void aiService.cancel(state.runId)
  stopListening()
  set({ phase: 'idle' })
}

export function closeAi(): void {
  if (state.phase === 'streaming') cancelAi()
  stopListening()
  state = IDLE
  for (const listener of listeners) listener()
}

export function retryAi(): void {
  void send()
}

export function setInstruction(instruction: string): void {
  set({ instruction })
}

/* ────────────────────────────────────────────────────────────────────────────
 * Writing the answer back
 * ─────────────────────────────────────────────────────────────────────────── */

export type AiApplyMode = 'replace' | 'insert'

/**
 * Puts the answer into the document.
 *
 * Never automatically: a model rewriting a user's prose without them seeing it
 * first is the one behaviour that would make this feature untrustworthy. The
 * dialog shows the result, and this runs only when they say so.
 */
export function applyAi(mode: AiApplyMode): boolean {
  const { target, output } = state
  const text = output.trim()
  const document = selectActiveDocument(getState())

  if (!target || !document || text === '') return false

  const applied =
    target.surface === 'rich' ? applyToRich(mode, target, text) : applyToSource(mode, target, text)

  if (!applied) {
    toast.warning(t('ai.movedOnTitle'), t('ai.movedOnDetail'))
    return false
  }

  toast.success(t('ai.applied'))
  return true
}

function applyToSource(mode: AiApplyMode, target: AiRunState['target'], text: string): boolean {
  if (!target) return false
  const view = editorRegistry.getSourceView()

  // Without a live source view — preview-only mode, say — the store is the only
  // route in, and it can only carry a whole-document replacement.
  if (!view) {
    const document = selectActiveDocument(getState())
    if (!document || target.scope !== 'document' || mode !== 'replace') return false
    dispatch(contentChanged({ id: document.id, content: text }))
    return true
  }

  const range = resolveRange(view.state.doc.toString(), target)
  if (!range) return false

  const insertion = mode === 'insert' ? `${target.text}\n\n${text}` : text
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: insertion },
    // Leave the new text selected: the user's next move is usually to look at
    // it, and an invisible change is a change they cannot undo confidently.
    selection: { anchor: range.from, head: range.from + insertion.length },
    scrollIntoView: true
  })
  view.focus()

  return true
}

/**
 * Finds where the text still lives.
 *
 * The stored range is authoritative when the document underneath it has not
 * changed; when it has, a single unambiguous occurrence is a safe second
 * choice, and anything else is refused rather than guessed at.
 */
function resolveRange(
  content: string,
  target: NonNullable<AiRunState['target']>
): { from: number; to: number } | null {
  if (target.scope === 'document') return { from: 0, to: content.length }

  const { range } = target
  if (range && content.slice(range.from, range.to) === target.text) return range

  const first = content.indexOf(target.text)
  if (first === -1) return null
  if (content.indexOf(target.text, first + 1) !== -1) return null

  return { from: first, to: first + target.text.length }
}

function applyToRich(mode: AiApplyMode, target: AiRunState['target'], text: string): boolean {
  const editor = editorRegistry.getRichEditor()
  if (!editor || !target) return false

  const html = markdownToRichHtml(text, getState().settings.values.markdown)

  if (target.scope === 'document' && mode === 'replace') {
    editor.commands.setContent(html)
    return true
  }

  // `insertContent` replaces the selection, which is exactly "replace"; for
  // "insert" the caret is collapsed to the end of it first, so the original
  // survives above the addition.
  const chain = editor.chain().focus()
  if (mode === 'insert') chain.setTextSelection(editor.state.selection.to)
  chain.insertContent(html).run()

  return true
}

function newRunId(): string {
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
