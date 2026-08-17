// ── @shared ────────────────────────────────────────────────────────────────
import type { AiKeyStatus, AiProfile } from '@shared'

// ── ../services ────────────────────────────────────────────────────────────
import { aiKeys } from '../services/ai-keys'
import { aiService, messageOf } from '../services/ai-service'
import { getSettings } from '../services/settings-service'

// ── ../window ──────────────────────────────────────────────────────────────
import { emitToRenderer } from '../window/main-window'

// ── ./ ─────────────────────────────────────────────────────────────────────
import { handle } from './register'

/**
 * The renderer's only route to a language model.
 *
 * Note what is *not* here: no channel returns a key, and no channel accepts a
 * base URL or a model name. Both come from the saved profile, which main reads
 * for itself — so a compromised renderer can ask for a rewrite, but it cannot
 * point the request somewhere else or read the credential.
 */
async function profileById(profileId: string): Promise<AiProfile> {
  const { ai } = await getSettings()
  const profile = ai.profiles.find((entry) => entry.id === profileId)
  if (!profile) throw new Error('That model is no longer configured.')
  return profile
}

export function registerAiHandlers(): void {
  handle('ai:run', async (request) => {
    let profile: AiProfile
    try {
      profile = await profileById(request.profileId)
    } catch (error) {
      return { ok: false, error: messageOf(error) }
    }

    const { ai } = await getSettings()
    if (!ai.enabled) return { ok: false, error: 'Assistance is turned off in Settings.' }

    /*
     * The run is *started* here and reported through events, rather than
     * awaited: a rewrite takes tens of seconds, and holding an IPC call open
     * for that long makes cancellation and progress impossible to express.
     */
    void aiService
      .run(request, profile, ai.houseStyle, (delta) => {
        emitToRenderer('event:aiChunk', { runId: request.runId, delta })
      })
      .then(() => {
        emitToRenderer('event:aiDone', { runId: request.runId, error: null, cancelled: false })
      })
      .catch((error: unknown) => {
        const cancelled = error instanceof Error && error.name === 'AbortError'
        emitToRenderer('event:aiDone', {
          runId: request.runId,
          error: cancelled ? null : messageOf(error),
          cancelled
        })
      })

    return { ok: true }
  })

  handle('ai:cancel', ({ runId }) => {
    aiService.cancel(runId)
  })

  handle('ai:test', async ({ profileId }) => aiService.test(await profileById(profileId)))

  handle('ai:listModels', async ({ profileId }) => aiService.listModels(await profileById(profileId)))

  handle('ai:setKey', async ({ profileId, key }) => {
    // Refuse to store a key for a profile that does not exist — otherwise the
    // renderer could seed the store with arbitrary ids.
    await profileById(profileId)
    aiKeys.set(profileId, key)
  })

  handle('ai:keyStatus', async () => {
    const { ai } = await getSettings()

    // Deleting a profile in the settings screen should forget its key, and this
    // is the one call every route into that screen makes.
    aiKeys.prune(ai.profiles.map((profile) => profile.id))

    return ai.profiles.map(
      (profile): AiKeyStatus => ({ profileId: profile.id, hasKey: aiKeys.has(profile.id) })
    )
  })

  handle('ai:encryptionAvailable', () => aiKeys.available())
}
