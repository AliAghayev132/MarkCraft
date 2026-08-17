// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { app, shell } from 'electron'

// ── ../security ────────────────────────────────────────────────────────────
import { atomicWriteFile } from '../security/atomic-write'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

// ── types ──────────────────────────────────────────────────────────────────
import type { CustomLocaleFile } from './types'

/** Guards against a filename escaping the languages folder. */
const SAFE_CODE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/

export function localesDirectory(): string {
  return path.join(app.getPath('userData'), 'languages')
}

export async function ensureLocalesDirectory(): Promise<string> {
  const dir = localesDirectory()
  await fs.mkdir(dir, { recursive: true })

  // A README in the folder is the difference between a discoverable feature and
  // an empty directory nobody understands.
  const readme = path.join(dir, 'README.txt')
  try {
    await fs.access(readme)
  } catch {
    await fs.writeFile(readme, README_TEXT, 'utf8').catch(() => undefined)
  }

  return dir
}

export async function listCustomLocales(): Promise<CustomLocaleFile[]> {
  const dir = localesDirectory()
  const results: CustomLocaleFile[] = []

  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return results
  }

  for (const name of names) {
    if (!name.toLowerCase().endsWith('.json')) continue

    const code = name.slice(0, -'.json'.length)
    if (!SAFE_CODE.test(code)) {
      logger.warn(`locales: skipping "${name}" — not a valid language code`)
      continue
    }

    try {
      const raw = await fs.readFile(path.join(dir, name), 'utf8')
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        logger.warn(`locales: skipping "${name}" — expected a JSON object`)
        continue
      }
      results.push({ code, messages: parsed as Record<string, unknown> })
    } catch (error) {
      logger.warn(`locales: could not read "${name}"`, error)
    }
  }

  return results
}

export async function revealLocalesDirectory(): Promise<void> {
  const dir = await ensureLocalesDirectory()
  await shell.openPath(dir)
}

/** Writes a starter file so a translator has something to edit. */
export async function writeLocaleTemplate(code: string, content: string): Promise<string> {
  if (!SAFE_CODE.test(code)) {
    throw Object.assign(new Error(`"${code}" is not a valid language code`), {
      code: 'INVALID_ARGUMENT'
    })
  }

  const dir = await ensureLocalesDirectory()
  const target = path.join(dir, `${code}.json`)
  await atomicWriteFile(target, content)
  return target
}

const README_TEXT = `MarkCraft — custom languages
============================

Drop a translation file in this folder to add a language to MarkCraft.

  1. Name the file after the language code, e.g. "de.json" or "pt-BR.json".
  2. Use an existing translation as the starting point — Settings > Language >
     "Export template..." writes one here for you.
  3. Reopen Settings > Language and choose "Reload languages".

Every key you leave out falls back to English, so you can translate a little at
a time and the application will still work.

The "$meta" block at the top of the file controls how the language appears in
the picker:

  "$meta": {
    "code": "de",
    "name": "German",
    "nativeName": "Deutsch",
    "direction": "ltr"
  }
`
