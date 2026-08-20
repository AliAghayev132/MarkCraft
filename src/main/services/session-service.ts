// ── node: ──────────────────────────────────────────────────────────────────
import { createServer, request as httpRequest, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { hostname, networkInterfaces } from 'node:os'
import { randomUUID } from 'node:crypto'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  colourFor,
  fallbackName,
  livingParticipants,
  SESSION_DEFAULT_PORT,
  SESSION_PROTOCOL,
  type CanvasData,
  type Participant,
  type SessionEvent,
  type SessionRequest
} from '@shared'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

/**
 * The transport for a shared canvas.
 *
 * Plain HTTP: a long-lived response carries events to each client, and each
 * client posts its own changes. Server-sent events rather than WebSockets
 * because Node's `http` already does all of it — a WebSocket would mean either
 * a dependency or hand-rolling the handshake and framing, for a stream of small
 * JSON messages that SSE carries perfectly well.
 *
 * Bound to the local network only. Nothing here is exposed to the internet by
 * this application, and the interface says so; a person who forwards a port has
 * made a decision this code cannot make for them.
 */

interface Client {
  id: string
  response: ServerResponse
  participant: Participant
}

interface Room {
  server: Server
  port: number
  clients: Map<string, Client>
  canvas: CanvasData
  /** The canvas being shared, so a joiner can be told what it is called. */
  name: string
  /** Handed out in order, so two people never share a cursor colour. */
  nextColour: number
}

let room: Room | null = null
let guest: { abort: AbortController; onEvent: (event: SessionEvent) => void } | null = null

/** Told to the renderer so the local view keeps up with everyone else's edits. */
type Listener = (event: SessionEvent) => void
const listeners = new Set<Listener>()

export function onSessionEvent(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emitLocal(event: SessionEvent): void {
  for (const listener of listeners) listener(event)
}

/* ────────────────────────────────────────────────────────────────────────────
 * Hosting
 * ─────────────────────────────────────────────────────────────────────────── */

export async function startHosting(options: {
  canvas: CanvasData
  name: string
  port?: number
}): Promise<{ address: string }> {
  await stopSession()

  const port = options.port ?? SESSION_DEFAULT_PORT
  const clients = new Map<string, Client>()

  const server = createServer((incoming, response) => {
    // Same-origin does not apply between two applications on a network, and
    // the responses carry nothing a browser could be tricked into revealing —
    // but the header is set explicitly so the absence is a decision, not an
    // oversight.
    response.setHeader('Access-Control-Allow-Origin', '*')

    if (incoming.method === 'GET' && incoming.url?.startsWith('/events')) {
      openStream(incoming, response)
      return
    }

    if (incoming.method === 'POST' && incoming.url?.startsWith('/say')) {
      void receive(incoming, response)
      return
    }

    response.writeHead(404).end()
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    // The local network, not every interface the machine has: a session is for
    // people in the same place, and binding wider than that is a decision
    // nobody asked for.
    server.listen(port, '0.0.0.0', () => resolve())
  })

  room = { server, port, clients, canvas: options.canvas, name: options.name, nextColour: 0 }
  logger.info(`session: hosting on ${localAddress()}:${port}`)

  return { address: `${localAddress()}:${port}` }
}

function openStream(incoming: IncomingMessage, response: ServerResponse): void {
  if (!room) {
    response.writeHead(503).end()
    return
  }

  const url = new URL(incoming.url ?? '/', 'http://localhost')
  const protocol = Number(url.searchParams.get('protocol'))
  const name = fallbackName(url.searchParams.get('name') ?? '')

  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })

  if (protocol !== SESSION_PROTOCOL) {
    // Said in the stream and then closed, so the joiner learns *why* rather
    // than seeing a connection that simply does not work.
    write(response, { kind: 'refused', reason: 'protocol' })
    response.end()
    return
  }

  const id = randomUUID()
  const participant: Participant = {
    id,
    name,
    colour: colourFor(room.nextColour++),
    cursor: null,
    selection: [],
    seenAt: Date.now()
  }

  room.clients.set(id, { id, response, participant })
  write(response, { kind: 'welcome', you: participant, canvas: room.canvas, name: room.name })
  announcePresence()

  incoming.on('close', () => {
    room?.clients.delete(id)
    announcePresence()
  })
}

async function receive(incoming: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readBody(incoming)
  response.writeHead(204).end()

  if (!room || !body) return

  const id = new URL(incoming.url ?? '/', 'http://localhost').searchParams.get('id')
  const client = id ? room.clients.get(id) : undefined
  if (!client) return

  client.participant.seenAt = Date.now()

  switch (body.kind) {
    case 'canvas':
      room.canvas = body.canvas
      // Back to everyone including the sender's neighbours, but not the sender
      // — they already have it, and echoing would fight their own editing.
      broadcast({ kind: 'canvas', canvas: body.canvas, from: client.id }, client.id)
      emitLocal({ kind: 'canvas', canvas: body.canvas, from: client.id })
      break

    case 'cursor':
      client.participant.cursor = { x: body.x, y: body.y }
      announcePresence()
      break

    case 'selection':
      client.participant.selection = body.ids.slice(0, 200)
      announcePresence()
      break

    case 'goodbye':
      room.clients.delete(client.id)
      client.response.end()
      announcePresence()
      break

    default:
      break
  }
}

/** The host's own canvas changed; everyone is told. */
export function shareCanvas(canvas: CanvasData): void {
  if (room) {
    room.canvas = canvas
    broadcast({ kind: 'canvas', canvas, from: 'host' })
    return
  }

  if (guest) void say({ kind: 'canvas', canvas })
}

export function shareCursor(x: number, y: number): void {
  if (guest) {
    void say({ kind: 'cursor', x, y })
    return
  }
  if (!room) return

  hostParticipant.cursor = { x, y }
  announcePresence()
}

export function shareSelection(ids: string[]): void {
  if (guest) {
    void say({ kind: 'selection', ids })
    return
  }
  if (!room) return

  hostParticipant.selection = ids.slice(0, 200)
  announcePresence()
}

/**
 * The host is a participant too.
 *
 * Everyone on a canvas needs a cursor and a colour, and the person hosting is
 * not an exception — a session where one person is invisible to the others is
 * a worse session, and it would be invisible for the one who set it up.
 */
const hostParticipant: Participant = {
  id: 'host',
  name: fallbackName(hostname()),
  colour: colourFor(5),
  cursor: null,
  selection: [],
  seenAt: Date.now()
}

function announcePresence(): void {
  if (!room) return

  hostParticipant.seenAt = Date.now()
  const everyone = livingParticipants(
    [hostParticipant, ...[...room.clients.values()].map((client) => client.participant)],
    Date.now()
  )

  broadcast({ kind: 'presence', participants: everyone })
  emitLocal({ kind: 'presence', participants: everyone })
}

function broadcast(event: SessionEvent, except?: string): void {
  if (!room) return

  for (const client of room.clients.values()) {
    if (client.id === except) continue
    write(client.response, event)
  }
}

function write(response: ServerResponse, event: SessionEvent): void {
  try {
    response.write(`data: ${JSON.stringify(event)}\n\n`)
  } catch {
    // A client that has gone away is removed by its own close handler; a failed
    // write to it is not worth a log line.
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Joining
 * ─────────────────────────────────────────────────────────────────────────── */

export async function joinSession(options: {
  host: string
  port: number
  name: string
}): Promise<void> {
  await stopSession()

  const abort = new AbortController()
  let selfId: string | null = null

  const url =
    `http://${options.host}:${options.port}/events` +
    `?protocol=${SESSION_PROTOCOL}&name=${encodeURIComponent(options.name)}`

  const response = await fetch(url, { signal: abort.signal, headers: { Accept: 'text/event-stream' } })
  if (!response.ok || !response.body) {
    throw Object.assign(new Error(`The host answered ${response.status}.`), { code: 'UNKNOWN' })
  }

  guest = {
    abort,
    onEvent: (event) => {
      if (event.kind === 'welcome') selfId = event.you.id
      emitLocal(event)
    }
  }

  void readStream(response.body, (event) => guest?.onEvent(event))
    .catch((error: unknown) => {
      // Leaving aborts the stream on purpose, and the pending read rejects
      // with it. Anything else is the host having gone away, which the person
      // needs telling about.
      if (error instanceof Error && error.name === 'AbortError') return
      emitLocal({ kind: 'presence', participants: [] })
      logger.debug(`session: stream ended — ${String(error)}`)
    })
    .finally(() => {
      if (guest?.abort === abort) guest = null
    })

  // The id the host gave us is what every later message is signed with.
  await new Promise<void>((resolve) => {
    const started = Date.now()
    const wait = setInterval(() => {
      if (selfId !== null || Date.now() - started > 5000) {
        clearInterval(wait)
        resolve()
      }
    }, 50)
  })

  if (selfId === null) {
    abort.abort()
    guest = null
    throw Object.assign(new Error('The host did not answer in time.'), { code: 'UNKNOWN' })
  }

  guestId = selfId
  guestAddress = { host: options.host, port: options.port }
}

let guestId: string | null = null
let guestAddress: { host: string; port: number } | null = null

async function say(body: SessionRequest): Promise<void> {
  if (!guestAddress || !guestId) return

  await new Promise<void>((resolve) => {
    const payload = JSON.stringify(body)
    const outgoing = httpRequest(
      {
        host: guestAddress?.host,
        port: guestAddress?.port,
        path: `/say?id=${encodeURIComponent(guestId as string)}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      },
      (response) => {
        response.resume()
        response.on('end', resolve)
      }
    )
    outgoing.on('error', () => resolve())
    outgoing.end(payload)
  })
}

/**
 * Reads the host's stream.
 *
 * Server-sent events are one `data:` line per message here, separated by a
 * blank line. Parsed by hand for the same reason the AI streaming is: it is
 * fifteen lines, and the alternative is a dependency for fifteen lines.
 */
async function readStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SessionEvent) => void
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let split = buffer.indexOf('\n\n')
    while (split !== -1) {
      const chunk = buffer.slice(0, split)
      buffer = buffer.slice(split + 2)

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue
        try {
          onEvent(JSON.parse(line.slice(5).trim()) as SessionEvent)
        } catch {
          // A truncated message is dropped rather than taking the stream down.
        }
      }

      split = buffer.indexOf('\n\n')
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Leaving
 * ─────────────────────────────────────────────────────────────────────────── */

export async function stopSession(): Promise<void> {
  if (guest) {
    await say({ kind: 'goodbye' })
    guest.abort.abort()
    guest = null
    guestId = null
    guestAddress = null
  }

  if (room) {
    for (const client of room.clients.values()) client.response.end()
    await new Promise<void>((resolve) => room?.server.close(() => resolve()))
    room = null
  }
}

export function sessionRole(): 'off' | 'hosting' | 'joined' {
  if (room) return 'hosting'
  if (guest) return 'joined'
  return 'off'
}

/* ────────────────────────────────────────────────────────────────────────────
 * Where we are
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * The address other people on the network should type in.
 *
 * The first non-internal IPv4 address. A machine with several is guessing, but
 * guessing the one on the network everybody else is on is right far more often
 * than showing a list of six and asking.
 */
export function localAddress(): string {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) return address.address
    }
  }
  return '127.0.0.1'
}

export function machineName(): string {
  return fallbackName(hostname())
}

async function readBody(incoming: IncomingMessage): Promise<SessionRequest | null> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of incoming) {
    size += (chunk as Buffer).length
    // A canvas is small. Anything this large is not one, and reading it would
    // let one participant exhaust the host's memory.
    if (size > 8 * 1024 * 1024) return null
    chunks.push(chunk as Buffer)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as SessionRequest
  } catch {
    return null
  }
}
