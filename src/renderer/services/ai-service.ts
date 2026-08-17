// ── @shared ────────────────────────────────────────────────────────────────
import type { AiKeyStatus, AiRunRequest, AiRunResult, AiTestResult } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { soft, unwrap } from './ipc'

export const aiService = {
  run(request: AiRunRequest): Promise<AiRunResult> {
    return unwrap(window.api.ai.run(request))
  },
  cancel(runId: string): Promise<void> {
    return soft(window.api.ai.cancel({ runId }), undefined)
  },
  test(profileId: string): Promise<AiTestResult> {
    return unwrap(window.api.ai.test({ profileId }))
  },
  listModels(profileId: string): Promise<string[]> {
    return unwrap(window.api.ai.listModels({ profileId }))
  },
  /** One-way: there is no channel that reads a key back. */
  setKey(profileId: string, key: string): Promise<void> {
    return unwrap(window.api.ai.setKey({ profileId, key }))
  },
  keyStatus(): Promise<AiKeyStatus[]> {
    return soft(window.api.ai.keyStatus(), [])
  },
  encryptionAvailable(): Promise<boolean> {
    return soft(window.api.ai.encryptionAvailable(), false)
  }
}
