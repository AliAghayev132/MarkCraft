// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs, type Dirent } from 'node:fs'
import path from 'node:path'

// ── @shared ────────────────────────────────────────────────────────────────
import { buildLinkGraph, type GraphFile, type LinkGraphResult } from '@shared'

// ── ./services ─────────────────────────────────────────────────────────────
import { NOISY_DIRECTORIES } from './fs-service'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.mdx'])

/*
 * The scan reads every document in the workspace, so it needs a ceiling that a
 * real project will not hit but a mistake will: a folder of generated output,
 * or a home directory opened by accident. Above these the graph is truncated
 * rather than the application stalled.
 */
const MAX_FILES = 3000
const MAX_BYTES = 2 * 1024 * 1024

/**
 * Builds the workspace link graph.
 *
 * In main rather than the renderer because it is thousands of small reads: on
 * the renderer side it would either block the editor or need every file shipped
 * across the IPC boundary, and the renderer only ever wants the finished graph.
 */
export async function buildWorkspaceGraph(root: string): Promise<LinkGraphResult> {
  const started = Date.now()
  const safeRoot = await pathGuard.assert(root)

  const files: GraphFile[] = []
  let truncated = false

  for await (const full of walk(safeRoot)) {
    if (files.length >= MAX_FILES) {
      truncated = true
      break
    }

    if (!MARKDOWN_EXTENSIONS.has(path.extname(full).toLowerCase())) continue

    try {
      const stats = await fs.stat(full)
      // A file this size is generated, not written; scanning it costs more
      // than the one node it would add is worth.
      if (stats.size > MAX_BYTES) continue

      files.push({
        path: path.relative(safeRoot, full).split(path.sep).join('/'),
        markdown: await fs.readFile(full, 'utf8')
      })
    } catch {
      // A file that vanished or cannot be read mid-scan is simply not in the
      // graph; failing the whole scan over one of them would be worse.
      continue
    }
  }

  return {
    ...buildLinkGraph(files),
    root: safeRoot,
    truncated,
    durationMs: Date.now() - started
  }
}

async function* walk(root: string): AsyncGenerator<string> {
  const stack: string[] = [root]

  while (stack.length > 0) {
    const dir = stack.pop() as string

    let dirents: Dirent[]
    try {
      dirents = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const dirent of dirents) {
      if (dirent.name.startsWith('.')) continue
      const full = path.join(dir, dirent.name)

      if (dirent.isDirectory()) {
        if (NOISY_DIRECTORIES.has(dirent.name)) continue
        stack.push(full)
      } else if (dirent.isFile()) {
        yield full
      }
    }
  }
}
