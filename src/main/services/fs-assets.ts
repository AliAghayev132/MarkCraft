// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'

// ── @shared ────────────────────────────────────────────────────────────────
import { type DirEntry } from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { atomicWriteFile } from '../security/atomic-write'
import { pathGuard } from '../security/path-guard'

// ── ./services ─────────────────────────────────────────────────────────────
import { toDirEntry } from './fs-entries'
import { freeDestination } from './fs-mutations'

/**
 * Images and other attachments.
 *
 * Binary rather than text, so none of the encoding or line-ending care above
 * applies — and none of it should be applied by accident, which is the reason
 * these do not share a file with the document reader.
 */

export async function readAsDataUrl(target: string): Promise<{ dataUrl: string; bytes: number }> {
  const resolved = await pathGuard.assert(target)
  const buffer = await fs.readFile(resolved)
  const mime = mimeForExtension(path.extname(resolved))
  return { dataUrl: `data:${mime};base64,${buffer.toString('base64')}`, bytes: buffer.length }
}

export async function writeBinary(
  target: string,
  base64: string,
  overwrite = false
): Promise<DirEntry> {
  const resolved = await pathGuard.assert(target)
  const destination = overwrite
    ? resolved
    : await freeDestination(path.dirname(resolved), path.basename(resolved))

  await atomicWriteFile(destination, Buffer.from(base64, 'base64'))
  return toDirEntry(destination)
}

/**
 * Copies an image (or any asset) next to the document so the Markdown can use
 * a short relative link instead of embedding megabytes of base64.
 */
export async function importAsset(
  sourcePath: string,
  documentDir: string,
  folder: string,
  data?: { base64: string; name: string }
): Promise<{ path: string; relative: string }> {
  const resolvedSource = await pathGuard.assert(sourcePath)
  const resolvedDir = await pathGuard.assert(path.join(documentDir, folder))

  await fs.mkdir(resolvedDir, { recursive: true })

  /*
   * A cropped or compressed image arrives as bytes rather than a path, but it
   * belongs in the same folder under the same naming rules — so it takes the
   * same route, and only the last step differs.
   */
  const name = data ? path.basename(data.name) : path.basename(resolvedSource)
  const destination = await freeDestination(resolvedDir, name)

  if (data) await fs.writeFile(destination, Buffer.from(data.base64, 'base64'))
  else await fs.copyFile(resolvedSource, destination)

  const relative = path.relative(documentDir, destination).split(path.sep).join('/')
  return { path: destination, relative: relative.startsWith('.') ? relative : `./${relative}` }
}

export async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}



const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon'
}

export function mimeForExtension(extension: string): string {
  return MIME_TYPES[extension.toLowerCase()] ?? 'application/octet-stream'
}

