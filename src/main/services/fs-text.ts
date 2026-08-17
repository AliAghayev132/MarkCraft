// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  MAX_OPEN_FILE_BYTES,
  type Eol,
  type FileContent,
  type WriteOutcome,
  type WriteRequest
} from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { atomicWriteFile, sha256 } from '../security/atomic-write'
import { pathGuard } from '../security/path-guard'

// ── ./services ─────────────────────────────────────────────────────────────
import { stampFromStats, stampOfResolved, stampsMatch } from './fs-entries'

/**
 * Document text in and out.
 *
 * The encoding and line-ending decisions live here together because they are
 * the same decision seen twice: what is read has to be written back the way it
 * arrived, or every save shows a whole-file diff.
 */
const BOM = '﻿'

export function detectEol(text: string): Eol {
  const crlf = (text.match(/\r\n/g) ?? []).length
  if (crlf === 0) return 'lf'
  const lf = (text.match(/\n/g) ?? []).length
  return crlf >= lf / 2 ? 'crlf' : 'lf'
}

export function applyEol(text: string, eol: Eol): string {
  const normalized = text.replace(/\r\n/g, '\n')
  return eol === 'crlf' ? normalized.replace(/\n/g, '\r\n') : normalized
}

export async function readTextFile(target: string): Promise<FileContent> {
  const resolved = await pathGuard.assert(target)
  const stats = await fs.stat(resolved)

  if (stats.isDirectory()) {
    throw Object.assign(new Error('Path is a directory'), { code: 'EISDIR' })
  }
  if (stats.size > MAX_OPEN_FILE_BYTES) {
    throw Object.assign(
      new Error(`File is ${Math.round(stats.size / 1024 / 1024)} MB, above the 32 MB limit`),
      { code: 'TOO_LARGE' }
    )
  }

  const buffer = await fs.readFile(resolved)
  const raw = buffer.toString('utf8')
  const bom = raw.startsWith(BOM)
  const withoutBom = bom ? raw.slice(1) : raw
  const eol = detectEol(withoutBom)

  return {
    path: resolved,
    // The renderer only ever sees LF; the original ending is restored on save.
    content: withoutBom.replace(/\r\n/g, '\n'),
    stamp: stampFromStats(stats, sha256(buffer)),
    eol,
    bom
  }
}

/**
 * Conflict-protected write. When `expect` is supplied the file is re-hashed
 * immediately before writing; a mismatch aborts without touching the file and
 * hands the current stamp back so the renderer can offer a real choice.
 */
export async function writeTextFile(request: WriteRequest): Promise<WriteOutcome> {
  const resolved = await pathGuard.assert(request.path)

  if (request.expect && !request.force) {
    const current = await stampOfResolved(resolved)
    if (current && !stampsMatch(current, request.expect)) {
      return { status: 'conflict', current }
    }
  }

  const eol = request.eol ?? 'lf'
  const body = applyEol(request.content, eol)
  const payload = (request.bom ? BOM : '') + body

  await atomicWriteFile(resolved, payload)

  const stats = await fs.stat(resolved)
  return { status: 'written', stamp: stampFromStats(stats, sha256(Buffer.from(payload, 'utf8'))) }
}


