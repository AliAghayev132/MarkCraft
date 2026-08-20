// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs, type Dirent } from 'node:fs'
import path from 'node:path'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  buildLinkGraph,
  summariseTags,
  tagsIn,
  type GraphFile,
  type LinkGraphResult,
  type TagSummary
} from '@shared'

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

/**
 * Every tag in the workspace, and which files carry it.
 *
 * The same walk as the graph, and for the same reason it lives here: thousands
 * of small reads belong on this side of the bridge, and the renderer only ever
 * wants the finished list. Kept separate from the graph rather than folded into
 * it, because a tag panel is opened far more often than a graph and should not
 * pay for one.
 */
export async function collectWorkspaceTags(
  root: string
): Promise<{ tags: TagSummary[]; truncated: boolean; durationMs: number }> {
  const started = Date.now()
  const safeRoot = await pathGuard.assert(root)

  const files: { path: string; tags: string[] }[] = []
  let truncated = false
  let seen = 0

  for await (const full of walk(safeRoot)) {
    if (seen >= MAX_FILES) {
      truncated = true
      break
    }

    if (!MARKDOWN_EXTENSIONS.has(path.extname(full).toLowerCase())) continue
    seen++

    try {
      const stats = await fs.stat(full)
      if (stats.size > MAX_BYTES) continue

      const tags = tagsIn(await fs.readFile(full, 'utf8'))
      // Only files that carry one: a workspace is mostly files that do not,
      // and holding them all would be a list of nothing.
      if (tags.length === 0) continue

      files.push({
        path: path.relative(safeRoot, full).split(path.sep).join('/'),
        tags
      })
    } catch {
      continue
    }
  }

  return { tags: summariseTags(files), truncated, durationMs: Date.now() - started }
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
