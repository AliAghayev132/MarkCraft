// ── ../services ────────────────────────────────────────────────────────────
import { runCode } from '../services/run-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

/**
 * Running a code block.
 *
 * No path guard: nothing here reads the workspace. The language is matched
 * against a fixed table before anything is spawned, so an unknown one never
 * reaches the process layer.
 */
export function registerRunHandlers(): void {
  handle('run:code', ({ language, code }) =>
    runCode(requireString(language, 'language'), requireString(code, 'code'))
  )
}
