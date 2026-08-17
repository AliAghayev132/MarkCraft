// ── @shared ────────────────────────────────────────────────────────────────
import { aiProvider } from '@shared'
import type {
  AiAction,
  AiProfile,
  AiRunRequest,
  AiTestResult,
  AiWireFormat
} from '@shared'

// ── ./ ─────────────────────────────────────────────────────────────────────
import { aiKeys } from './ai-keys'

/**
 * Talks to whichever language-model API the user connected.
 *
 * This lives in main for two reasons that are not negotiable: the renderer is
 * sandboxed behind a CSP that forbids every external host, and the API key must
 * never exist in a process that also renders untrusted Markdown. The renderer
 * asks for a run and receives text back — it never learns the credential.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * Prompts
 *
 * Written in English regardless of the interface language, because that is what
 * these models are strongest at following — but each one is told to answer in
 * the language of the input, which is the part the user actually notices.
 * ─────────────────────────────────────────────────────────────────────────── */

const SYSTEM = [
  'You are a careful Markdown editor working inside a desktop editor.',
  'Rules you must not break:',
  '1. Reply with the finished Markdown and nothing else — no preamble, no explanation, no code fence around the whole answer.',
  '2. Answer in the same language as the input.',
  '3. Preserve the meaning, the facts, the links, the code blocks and the front matter exactly.',
  '4. Keep the heading levels the input uses.'
].join('\n')

/*
 * A review is the one action that must not return a document. Its rules are
 * the opposite of the editor's — findings rather than prose, and nothing
 * rewritten — so it gets its own system prompt rather than an instruction
 * fighting the one above it.
 */
const REVIEW_SYSTEM = [
  'You are reviewing a Markdown document for its author. You are not editing it.',
  'Rules you must not break:',
  '1. Do not rewrite the document. Report findings only.',
  '2. Reply as a Markdown list. Each item: what is wrong, where, and what to do about it.',
  '3. Answer in the same language as the document.',
  '4. Report at most eight findings, most important first. If the document reads well, say so in one line.',
  '5. Ignore spelling and grammar unless they change the meaning — the editor already checks those.',
  '6. Do not invent facts about the subject to judge the document by.'
].join('\n')

const INSTRUCTIONS: Record<Exclude<AiAction, 'custom'>, string> = {
  polish:
    'Tidy up the text below: fix grammar, spelling and punctuation, smooth the phrasing and make the Markdown formatting consistent. Do not add new information and do not remove any.',
  elaborate:
    'Expand the text below with more detail: develop the existing points, add the explanation a reader would need, and keep the same voice. Do not invent facts, figures, names or citations.',
  summarize:
    'Shorten the text below to its essentials, keeping the most important points and the original structure where it still makes sense.',
  review:
    'Review the document below. Look for: structure that does not match the content, sections that are missing or in the wrong order, claims left unexplained, inconsistent terminology, headings that do not say what follows them, and passages a reader would have to re-read.'
}

function buildPrompt(request: AiRunRequest, houseStyle: string): { system: string; user: string } {
  const instruction =
    request.action === 'custom'
      ? (request.instruction ?? '').trim()
      : INSTRUCTIONS[request.action]

  const base = request.action === 'review' ? REVIEW_SYSTEM : SYSTEM
  const system = houseStyle.trim()
    ? `${base}\n\nThe user's house style, which overrides the above where they conflict:\n${houseStyle.trim()}`
    : base

  return { system, user: `${instruction}\n\n---\n\n${request.input}` }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Endpoints
 * ─────────────────────────────────────────────────────────────────────────── */

function baseUrlOf(profile: AiProfile): string {
  const raw = (profile.baseUrl || aiProvider(profile.provider).baseUrl).trim()
  const url = new URL(raw)

  // Anything but HTTP(S) would be a way to make main open something else
  // entirely on behalf of whatever wrote the settings file.
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`The address for "${profile.name}" must start with http:// or https://.`)
  }

  return raw.replace(/\/+$/, '')
}

function wireOf(profile: AiProfile): AiWireFormat {
  return aiProvider(profile.provider).wire
}

function authHeaders(profile: AiProfile): Record<string, string> {
  const preset = aiProvider(profile.provider)
  const key = aiKeys.get(profile.id)?.trim()

  if (preset.needsKey && !key) {
    throw new Error(
      `No API key is saved for "${profile.name}". Paste one under Settings → AI and click away from the field before testing.`
    )
  }
  if (!key) return {}

  switch (wireOf(profile)) {
    case 'anthropic':
      return { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    case 'gemini':
      return { 'x-goog-api-key': key }
    default:
      return { Authorization: `Bearer ${key}` }
  }
}

function requestHeaders(profile: AiProfile): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(profile)
  }

  // OpenRouter attributes traffic to an app; sending it is good manners and
  // costs nothing. Everyone else ignores the pair.
  if (profile.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/markcraft'
    headers['X-Title'] = 'MarkCraft'
  }

  return headers
}

function chatUrl(profile: AiProfile, stream: boolean): string {
  const base = baseUrlOf(profile)

  switch (wireOf(profile)) {
    case 'anthropic':
      return `${base}/messages`
    case 'gemini': {
      const method = stream ? 'streamGenerateContent' : 'generateContent'
      const query = stream ? '?alt=sse' : ''
      return `${base}/models/${encodeURIComponent(profile.model)}:${method}${query}`
    }
    default:
      return `${base}/chat/completions`
  }
}

function chatBody(
  profile: AiProfile,
  prompt: { system: string; user: string },
  stream: boolean,
  tokenBudget?: number
): unknown {
  const temperature = clamp(profile.temperature, 0, 2)

  /*
   * The floor is deliberately tiny. Metered keys can carry a spend limit of a
   * couple of hundred tokens, and a floor above it makes every request fail
   * with "you cannot afford this" — a limit of ours, reported as a limit of
   * theirs.
   */
  const maxTokens = Math.max(16, Math.min(tokenBudget ?? profile.maxTokens, 32_000))

  switch (wireOf(profile)) {
    case 'anthropic':
      return {
        model: profile.model,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
        max_tokens: maxTokens,
        temperature,
        stream
      }
    case 'gemini':
      return {
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens }
      }
    default:
      return {
        model: profile.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature,
        max_tokens: maxTokens,
        stream
      }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min
}

/**
 * Pulls the text out of one streamed event.
 *
 * The three dialects differ only in where they put it, so this is a lookup
 * rather than three parsers.
 */
function deltaFrom(wire: AiWireFormat, payload: unknown): string {
  if (payload === null || typeof payload !== 'object') return ''
  const data = payload as Record<string, never>

  if (wire === 'anthropic') {
    const delta = data['delta'] as { text?: string } | undefined
    return typeof delta?.text === 'string' ? delta.text : ''
  }

  if (wire === 'gemini') {
    const candidates = data['candidates'] as
      | Array<{ content?: { parts?: Array<{ text?: string }> } }>
      | undefined
    const parts = candidates?.[0]?.content?.parts ?? []
    return parts.map((part) => part.text ?? '').join('')
  }

  const choices = data['choices'] as
    | Array<{ delta?: { content?: string }; message?: { content?: string } }>
    | undefined
  return choices?.[0]?.delta?.content ?? choices?.[0]?.message?.content ?? ''
}

/**
 * Turns an HTTP failure into something a user can act on.
 *
 * "401" on its own tells them nothing; "the key was rejected" tells them where
 * to look. The provider's own message is appended when there is one, because it
 * is usually the most specific thing available.
 */
async function describeFailure(response: Response, profile: AiProfile): Promise<string> {
  let detail = ''
  try {
    const text = await response.text()
    const parsed: unknown = JSON.parse(text)
    const error = (parsed as { error?: { message?: string } | string })?.error
    detail = typeof error === 'string' ? error : (error?.message ?? text.slice(0, 300))
  } catch {
    /* A non-JSON body: the status alone will have to do. */
  }

  const prefix =
    response.status === 401 || response.status === 403
      ? `${aiProvider(profile.provider).label} rejected the API key`
      : response.status === 404
        ? `The model "${profile.model}" was not found at that address`
        : response.status === 429
          ? 'Rate limit or quota reached'
          : `The request failed (HTTP ${response.status})`

  return detail ? `${prefix}: ${detail}` : `${prefix}.`
}

/* ────────────────────────────────────────────────────────────────────────────
 * Running
 * ─────────────────────────────────────────────────────────────────────────── */

const inFlight = new Map<string, AbortController>()

export const aiService = {
  cancel(runId: string): void {
    inFlight.get(runId)?.abort()
    inFlight.delete(runId)
  },

  cancelAll(): void {
    for (const controller of inFlight.values()) controller.abort()
    inFlight.clear()
  },

  /**
   * Streams a completion, calling `onDelta` as text arrives.
   *
   * Streaming rather than waiting for the whole answer because rewriting a
   * section takes tens of seconds: watching it arrive is the difference between
   * a working feature and one the user assumes has hung.
   */
  async run(
    request: AiRunRequest,
    profile: AiProfile,
    houseStyle: string,
    onDelta: (delta: string) => void
  ): Promise<void> {
    const controller = new AbortController()
    inFlight.set(request.runId, controller)

    try {
      const prompt = buildPrompt(request, houseStyle)
      const wire = wireOf(profile)

      const response = await fetch(chatUrl(profile, true), {
        method: 'POST',
        headers: requestHeaders(profile),
        body: JSON.stringify(chatBody(profile, prompt, true)),
        signal: controller.signal
      })

      if (!response.ok) throw new Error(await describeFailure(response, profile))
      if (!response.body) throw new Error('The provider returned an empty response.')

      await readServerSentEvents(response.body, (payload) => {
        const delta = deltaFrom(wire, payload)
        if (delta) onDelta(delta)
      })
    } finally {
      inFlight.delete(request.runId)
    }
  },

  /** A one-word round trip, so "does this actually work?" is answerable. */
  async test(profile: AiProfile): Promise<AiTestResult> {
    try {
      const response = await fetch(chatUrl(profile, false), {
        method: 'POST',
        headers: requestHeaders(profile),
        body: JSON.stringify(
          chatBody(
            profile,
            { system: 'Reply with the single word: ready', user: 'Reply with the single word: ready' },
            false,
            // A test must work on the most tightly limited key there is.
            32
          )
        ),
        signal: AbortSignal.timeout(30_000)
      })

      if (!response.ok) return { ok: false, detail: await describeFailure(response, profile) }

      const payload: unknown = await response.json()
      const reply = deltaFrom(wireOf(profile), payload).trim()
      return { ok: true, detail: reply || 'The provider answered.' }
    } catch (error) {
      return { ok: false, detail: messageOf(error) }
    }
  },

  /**
   * The models this key may use.
   *
   * Typing a model id by hand is the single most common way to get a 404, so
   * the settings screen offers the real list wherever the provider publishes
   * one — and falls back to free text when it does not.
   */
  async listModels(profile: AiProfile): Promise<string[]> {
    const base = baseUrlOf(profile)
    const wire = wireOf(profile)
    const url = wire === 'gemini' ? `${base}/models` : `${base}/models`

    const response = await fetch(url, {
      headers: requestHeaders(profile),
      signal: AbortSignal.timeout(20_000)
    })
    if (!response.ok) throw new Error(await describeFailure(response, profile))

    const payload = (await response.json()) as {
      data?: Array<{ id?: string }>
      models?: Array<{ id?: string; name?: string }>
    }

    const ids = (payload.data ?? payload.models ?? [])
      .map((entry) => entry.id ?? ('name' in entry ? entry.name : undefined))
      // Gemini returns "models/gemini-2.5-flash"; the request wants the bare id.
      .map((id) => (typeof id === 'string' ? id.replace(/^models\//, '') : null))
      .filter((id): id is string => Boolean(id))

    return [...new Set(ids)].sort((a, b) => a.localeCompare(b))
  }
}

export function messageOf(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return 'The request timed out or was cancelled.'
    }
    // undici's connection failures carry the useful part in `cause`.
    const cause = (error as { cause?: { code?: string } }).cause
    if (cause?.code === 'ECONNREFUSED') {
      return 'Nothing answered at that address — is the server running?'
    }
    if (cause?.code === 'ENOTFOUND') return 'That address could not be resolved.'
    return error.message
  }
  return String(error)
}

/**
 * Reads an SSE body, handing each parsed `data:` payload to `onEvent`.
 *
 * Written out rather than pulled in as a dependency: the format is four lines
 * of parsing, and the alternative is a package in the main process — the one
 * place where a supply-chain problem is unbounded.
 */
async function readServerSentEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (payload: unknown) => void
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Events are separated by a blank line; a chunk may split one in half.
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')

      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue

        const data = line.slice(5).trim()
        if (data === '' || data === '[DONE]') continue

        try {
          onEvent(JSON.parse(data))
        } catch {
          // A partial or non-JSON keep-alive frame; skipping it is correct.
        }
      }
    }
  }
}
