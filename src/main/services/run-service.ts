// ── node: ──────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'

// ── @shared ────────────────────────────────────────────────────────────────
import { runnerFor, tailLimit, type RunResult } from '@shared'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

/**
 * Runs one code block, once, because the user pressed Run.
 *
 * This is the most dangerous thing the application does, so the limits are
 * worth stating plainly:
 *
 *   • The code runs with the user's own permissions. There is no sandbox, and
 *     claiming one would be a lie — it can read their files and reach the
 *     network exactly as a script they saved and ran themselves could.
 *   • It is never automatic. Not on open, not on save, not on preview. One
 *     block, one press.
 *   • `spawn` with an argument array and `shell: false`, so nothing in the
 *     code, the language or the path is ever interpreted as a command line.
 *   • A time limit, an output ceiling, and a temporary directory that is
 *     removed afterwards whatever happened.
 */
const TIMEOUT_MS = 10_000
const MAX_OUTPUT = 100_000

export async function runCode(language: string, code: string): Promise<RunResult> {
  const runner = runnerFor(language)
  if (!runner) {
    throw Object.assign(new Error(`Nothing here can run "${language}".`), {
      code: 'INVALID_ARGUMENT'
    })
  }

  // Its own directory, so a script that writes beside itself cannot collide
  // with another run and cannot leave anything behind.
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'markcraft-run-'))
  const file = path.join(directory, `block-${randomUUID().slice(0, 8)}.${runner.extension}`)

  try {
    await fs.writeFile(file, code, 'utf8')
    return await execute(runner.command, [...runner.args, file], directory)
  } finally {
    await fs.rm(directory, { recursive: true, force: true }).catch((error: unknown) => {
      logger.error('run: could not remove the temporary directory', error)
    })
  }
}

function execute(command: string, args: string[], cwd: string): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const started = Date.now()

    let child
    try {
      child = spawn(command, args, {
        cwd,
        // Never a shell: the arguments are a list, and nothing in them can turn
        // into a second command.
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
    } catch (error) {
      reject(error)
      return
    }

    let stdout = ''
    let stderr = ''
    let timedOut = false

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, TIMEOUT_MS)

    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      // The overwhelmingly common failure: the language is not installed. Say
      // that, rather than passing on a spawn error nobody can act on.
      reject(
        error.code === 'ENOENT'
          ? Object.assign(new Error(`"${command}" is not installed, or not on PATH.`), {
              code: 'NOT_INSTALLED'
            })
          : error
      )
    })

    child.on('close', (exitCode) => {
      clearTimeout(timer)

      const out = tailLimit(stdout, MAX_OUTPUT)
      const err = tailLimit(stderr, MAX_OUTPUT)

      resolve({
        stdout: out.text,
        stderr: err.text,
        exitCode: timedOut ? null : exitCode,
        durationMs: Date.now() - started,
        timedOut,
        truncated: out.truncated || err.truncated
      })
    })
  })
}
