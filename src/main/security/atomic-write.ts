// ── node: ──────────────────────────────────────────────────────────────────
import { createHash, randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'

/**
 * Writes are staged to a sibling temp file, flushed to disk, then renamed over
 * the target. `rename` is atomic on both NTFS and POSIX filesystems, so a crash
 * (or a pulled power cable) mid-write leaves either the old file or the new
 * one — never a half-written document.
 */
export async function atomicWriteFile(
  target: string,
  data: string | Buffer,
  encoding: BufferEncoding = 'utf8'
): Promise<void> {
  const dir = path.dirname(target)
  await fs.mkdir(dir, { recursive: true })

  const tmp = path.join(dir, `.${path.basename(target)}.${randomBytes(6).toString('hex')}.tmp`)
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, encoding)

  let handle: FileHandle | undefined
  try {
    handle = await fs.open(tmp, 'w')
    await handle.write(buffer)
    await handle.sync()
    await handle.close()
    handle = undefined

    await fs.rename(tmp, target)
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined)
    await fs.rm(tmp, { force: true }).catch(() => undefined)
    throw error
  }
}

export function sha256(data: string | Buffer): string {
  return createHash('sha256')
    .update(Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'))
    .digest('hex')
}
