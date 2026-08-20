// ── @shared ────────────────────────────────────────────────────────────────
import {
  livingParticipants,
  SESSION_OFF,
  type Participant,
  type SessionState
} from '@shared'

/**
 * Who is on this canvas, and how.
 *
 * Outside Redux for the same reason the canvas target is: presence changes
 * twenty times a second while a pointer moves, and putting that through the
 * store would re-render every subscriber in the application for something only
 * the canvas draws.
 */
const listeners = new Set<() => void>()
let state: SessionState = SESSION_OFF

function emit(): void {
  for (const listener of listeners) listener()
}

function set(next: SessionState): void {
  state = next
  emit()
}

export const sessionState = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get(): SessionState {
    return state
  },
  hosting(address: string): void {
    set({ role: 'hosting', address, participants: [], problem: null })
  },
  joined(): void {
    set({ role: 'joined', address: null, participants: [], problem: null })
  },
  off(problem: string | null = null): void {
    set({ ...SESSION_OFF, problem })
  },
  /**
   * Everyone the host knows about, minus whoever this machine is.
   *
   * Drawing your own cursor as a second pointer chasing your real one is the
   * single most confusing thing a presence layer can do.
   */
  present(participants: Participant[], selfId: string | null): void {
    set({
      ...state,
      participants: livingParticipants(participants, Date.now()).filter(
        (participant) => participant.id !== selfId
      )
    })
  },
  problem(message: string): void {
    set({ ...state, problem: message })
  }
}

/**
 * Which participant this machine is.
 *
 * The host knows itself as `host`; a guest is told its id in the welcome. Kept
 * beside the state rather than inside it because nothing renders it — it exists
 * only so the local cursor is not drawn twice.
 */
let selfId: string | null = null

export function setSelfId(id: string | null): void {
  selfId = id
}

export function getSelfId(): string | null {
  return selfId
}
