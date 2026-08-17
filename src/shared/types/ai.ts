/**
 * Assistance from a language model the user brings themselves.
 *
 * MarkCraft ships no key, no account and no default endpoint: the feature is
 * inert until someone connects a provider they already pay for. That is the
 * whole design constraint, and it is why the shapes below describe *someone
 * else's* API rather than a service of ours.
 *
 * Nearly every vendor now speaks OpenAI's `/chat/completions` dialect, so one
 * adapter covers most of the field; Anthropic and Google are the two that are
 * worth speaking natively rather than through a compatibility shim.
 */
export type AiWireFormat = 'openai' | 'anthropic' | 'gemini'

export type AiProviderId =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'deepseek'
  | 'mistral'
  | 'together'
  | 'xai'
  | 'fireworks'
  | 'ollama'
  | 'lmstudio'
  | 'custom'

export interface AiProviderPreset {
  id: AiProviderId
  /** Shown as-is; a vendor name is not translated. */
  label: string
  wire: AiWireFormat
  baseUrl: string
  /** Local runtimes serve an unauthenticated endpoint on the loopback address. */
  needsKey: boolean
  /** Whether the provider can enumerate the models the key may use. */
  canListModels: boolean
  /** Where to get a key — opened in the system browser, never in-app. */
  keyUrl: string | null
  /** A sensible starting point, so a new profile is usable before editing. */
  suggestedModel: string
}

/**
 * The catalogue is deliberately a plain list rather than a registry with
 * behaviour: a provider is a base URL plus which of three dialects it speaks,
 * and pretending otherwise would buy nothing.
 */
export const AI_PROVIDERS: readonly AiProviderPreset[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    wire: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    needsKey: true,
    canListModels: true,
    keyUrl: 'https://openrouter.ai/keys',
    suggestedModel: 'anthropic/claude-sonnet-4.5'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    wire: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    needsKey: true,
    canListModels: true,
    keyUrl: 'https://platform.openai.com/api-keys',
    suggestedModel: 'gpt-4.1-mini'
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    wire: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    needsKey: true,
    canListModels: true,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    suggestedModel: 'claude-sonnet-4-5'
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    wire: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    needsKey: true,
    canListModels: true,
    keyUrl: 'https://aistudio.google.com/apikey',
    suggestedModel: 'gemini-2.5-flash'
  },
  {
    id: 'groq',
    label: 'Groq',
    wire: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    needsKey: true,
    canListModels: true,
    keyUrl: 'https://console.groq.com/keys',
    suggestedModel: 'llama-3.3-70b-versatile'
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    wire: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    needsKey: true,
    canListModels: true,
    keyUrl: 'https://platform.deepseek.com/api_keys',
    suggestedModel: 'deepseek-chat'
  },
  {
    id: 'mistral',
    label: 'Mistral',
    wire: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    needsKey: true,
    canListModels: true,
    keyUrl: 'https://console.mistral.ai/api-keys',
    suggestedModel: 'mistral-large-latest'
  },
  {
    id: 'together',
    label: 'Together AI',
    wire: 'openai',
    baseUrl: 'https://api.together.xyz/v1',
    needsKey: true,
    canListModels: true,
    keyUrl: 'https://api.together.ai/settings/api-keys',
    suggestedModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
  },
  {
    id: 'xai',
    label: 'xAI',
    wire: 'openai',
    baseUrl: 'https://api.x.ai/v1',
    needsKey: true,
    canListModels: true,
    keyUrl: 'https://console.x.ai',
    suggestedModel: 'grok-4'
  },
  {
    id: 'fireworks',
    label: 'Fireworks AI',
    wire: 'openai',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    needsKey: true,
    canListModels: true,
    keyUrl: 'https://fireworks.ai/account/api-keys',
    suggestedModel: 'accounts/fireworks/models/llama4-maverick-instruct-basic'
  },
  {
    id: 'ollama',
    label: 'Ollama',
    wire: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    needsKey: false,
    canListModels: true,
    keyUrl: null,
    suggestedModel: 'llama3.2'
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    wire: 'openai',
    baseUrl: 'http://localhost:1234/v1',
    needsKey: false,
    canListModels: true,
    keyUrl: null,
    suggestedModel: 'local-model'
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    wire: 'openai',
    baseUrl: '',
    needsKey: true,
    canListModels: true,
    keyUrl: null,
    suggestedModel: ''
  }
]

export function aiProvider(id: AiProviderId): AiProviderPreset {
  return AI_PROVIDERS.find((provider) => provider.id === id) ?? AI_PROVIDERS[0]
}

/**
 * One saved connection.
 *
 * Profiles rather than a single "the model" setting because the useful setup is
 * two or three: something fast and cheap for tidying a paragraph, something
 * stronger for rewriting a section. Switching between them is a click.
 */
export interface AiProfile {
  id: string
  /** The user's own name for it, e.g. "Fast draft". */
  name: string
  provider: AiProviderId
  /** Resolved from the preset, but editable — proxies and gateways are common. */
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
}

/** What the buttons in the editor do. */
export type AiAction = 'polish' | 'elaborate' | 'summarize' | 'review' | 'custom'

export interface AiSettings {
  enabled: boolean
  activeProfileId: string | null
  profiles: AiProfile[]
  /**
   * Show the prompt and the target text before sending anything.
   *
   * Defaults to on: the text leaves the machine for a third party, and that
   * should be a decision rather than a side effect of a mis-click.
   */
  confirmBeforeRun: boolean
  /** Appended to every request — house style, terminology, tone. */
  houseStyle: string
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  activeProfileId: null,
  profiles: [],
  confirmBeforeRun: true,
  houseStyle: ''
}

/* ────────────────────────────────────────────────────────────────────────────
 * The wire
 * ─────────────────────────────────────────────────────────────────────────── */

export interface AiRunRequest {
  runId: string
  profileId: string
  action: AiAction
  /** The Markdown the user selected, or the whole document. */
  input: string
  /** Only meaningful for `custom`. */
  instruction?: string
}

export interface AiRunResult {
  ok: boolean
  /** Present when `ok` is false — already human-readable. */
  error?: string
}

export interface AiChunkEvent {
  runId: string
  delta: string
}

export interface AiDoneEvent {
  runId: string
  error: string | null
  cancelled: boolean
}

export interface AiKeyStatus {
  profileId: string
  hasKey: boolean
}

export interface AiTestResult {
  ok: boolean
  /** The model's own reply, or the failure, in the user's face either way. */
  detail: string
}
