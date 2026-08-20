/**
 * Working on one canvas together.
 *
 * On the local network, not through a service. One person's application hosts;
 * the others join by address. There is no account, no relay, and nothing about
 * the document leaves the network the people are already on — which is the
 * whole reason it is built this way rather than against somebody's realtime
 * platform. The cost is honest and stated plainly in the interface: everyone
 * has to be able to reach the host.
 *
 * The host is the authority. It holds the canvas, applies every change in the
 * order it arrives, and tells everyone the result. That is not the most
 * sophisticated model — a proper CRDT would let two people edit the same card's
 * text at once without a winner — but it is the one that is *correct* for what
 * a canvas actually is: people move, colour and connect cards, and for those,
 * last-one-wins is both what happens in the room and what everybody expects.
 *
 * Everything here is the vocabulary. The transport is in main and the interface
 * is in the renderer; neither belongs in a file that has to be agreed on by two
 * machines.
 */

// ── ./shared ───────────────────────────────────────────────────────────────
import type { CanvasData } from './canvas'

/** Bumped when a message changes shape, so mismatched versions say so. */
export const SESSION_PROTOCOL = 1

export const SESSION_DEFAULT_PORT = 7351

/**
 * Who is in the room.
 *
 * The colour is assigned by the host from a fixed wheel rather than chosen: a
 * cursor's colour is how you tell one person from another at a glance, and two
 * people picking the same one is exactly the case it must not allow.
 */
export interface Participant {
  id: string
  name: string
  /** An index into the six canvas colour slots. */
  colour: string
  /** Canvas coordinates. Null before they have moved the pointer. */
  cursor: { x: number; y: number } | null
  /** What they have selected, so it can be outlined in their colour. */
  selection: string[]
  /** Milliseconds since the epoch, from the host's clock. */
  seenAt: number
}

/** What a client asks the host to do. */
export type SessionRequest =
  | { kind: 'hello'; protocol: number; name: string }
  | { kind: 'goodbye' }
  /**
   * The whole canvas, after a change. Sent rather than a diff because a canvas
   * is small — a hundred cards is a few kilobytes — and a diff protocol has a
   * class of bug that a full state simply cannot have: drifting apart while
   * both sides believe they agree.
   */
  | { kind: 'canvas'; canvas: CanvasData }
  | { kind: 'cursor'; x: number; y: number }
  | { kind: 'selection'; ids: string[] }

/** What the host tells everyone. */
export type SessionEvent =
  | { kind: 'welcome'; you: Participant; canvas: CanvasData; name: string }
  | { kind: 'refused'; reason: 'protocol' | 'full' }
  | { kind: 'canvas'; canvas: CanvasData; from: string }
  | { kind: 'presence'; participants: Participant[] }

export type SessionRole = 'off' | 'hosting' | 'joined'

export interface SessionState {
  role: SessionRole
  /** What to tell other people to type in. Host only. */
  address: string | null
  /** Everyone else. The local person is not in here. */
  participants: Participant[]
  /** Set when a join failed or a host went away. */
  problem: string | null
}

export const SESSION_OFF: SessionState = {
  role: 'off',
  address: null,
  participants: [],
  problem: null
}

/**
 * The colour wheel cursors are handed out from.
 *
 * The same six the canvas itself uses, so a session does not introduce a second
 * palette that means something different.
 */
export const CURSOR_COLOURS = ['5', '4', '6', '2', '1', '3'] as const

export function colourFor(index: number): string {
  return CURSOR_COLOURS[index % CURSOR_COLOURS.length]
}

/**
 * A participant is gone when they stop saying anything.
 *
 * Long enough that a laptop lid closing for a moment does not evict someone,
 * short enough that a cursor does not sit abandoned on the canvas.
 */
export const PRESENCE_TIMEOUT = 15_000

export function livingParticipants(participants: Participant[], now: number): Participant[] {
  return participants.filter((participant) => now - participant.seenAt < PRESENCE_TIMEOUT)
}

/**
 * How often a moving pointer is reported.
 *
 * Twenty a second looks continuous and costs nothing on a local network. Higher
 * would be sending frames nobody can see; lower and a cursor starts to hop.
 */
export const CURSOR_INTERVAL = 50

/** Reads `host:port`, or just a host, into something connectable. */
export function parseAddress(input: string): { host: string; port: number } | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  // A bare IPv6 address has colons of its own, so the port is only the part
  // after the last one when there is a bracket or a single colon.
  const match = trimmed.match(/^\[([^\]]+)\](?::(\d+))?$/) ?? trimmed.match(/^([^:]+)(?::(\d+))?$/)
  if (!match) return null

  const host = match[1]
  const port = match[2] ? Number(match[2]) : SESSION_DEFAULT_PORT

  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  if (!/^[\w.-]+$/.test(host) && !host.includes(':')) return null

  return { host, port }
}

/**
 * A name to show when the person has not set one.
 *
 * Their machine's name, not their account name: it is what identifies a laptop
 * in a room of laptops, and it does not put anybody's real name on a canvas
 * they did not choose to put it on.
 */
export function fallbackName(hostname: string): string {
  const trimmed = hostname.trim()
  return trimmed === '' ? 'Someone' : trimmed.slice(0, 40)
}
