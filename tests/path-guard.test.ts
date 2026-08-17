import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ForbiddenPathError, pathGuard } from '@main/security/path-guard'

/**
 * The path guard is the boundary that keeps a renderer compromise from becoming
 * whole-disk access. These tests exist because a regression here would be both
 * silent and severe.
 */
let root: string
let outside: string

beforeAll(async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'markcraft-guard-'))
  root = path.join(base, 'workspace')
  outside = path.join(base, 'private')

  await fs.mkdir(path.join(root, 'docs'), { recursive: true })
  await fs.mkdir(outside, { recursive: true })
  await fs.writeFile(path.join(root, 'docs', 'a.md'), '# a')
  await fs.writeFile(path.join(outside, 'secret.txt'), 'secret')
})

afterAll(async () => {
  await fs.rm(path.dirname(root), { recursive: true, force: true }).catch(() => undefined)
})

beforeEach(() => {
  pathGuard.reset()
})

describe('pathGuard', () => {
  it('denies everything before a root is granted', async () => {
    await expect(pathGuard.assert(path.join(root, 'docs', 'a.md'))).rejects.toBeInstanceOf(
      ForbiddenPathError
    )
  })

  it('allows paths inside a granted root', async () => {
    pathGuard.grantRoot(root)
    await expect(pathGuard.assert(path.join(root, 'docs', 'a.md'))).resolves.toContain('a.md')
  })

  it('allows paths that do not exist yet inside a granted root', async () => {
    pathGuard.grantRoot(root)
    const target = path.join(root, 'docs', 'new', 'deeper', 'note.md')
    await expect(pathGuard.assert(target)).resolves.toBeTruthy()
  })

  it('rejects traversal out of a granted root', async () => {
    pathGuard.grantRoot(root)
    const escape = path.join(root, '..', 'private', 'secret.txt')
    await expect(pathGuard.assert(escape)).rejects.toBeInstanceOf(ForbiddenPathError)
  })

  it('rejects an unrelated absolute path', async () => {
    pathGuard.grantRoot(root)
    await expect(pathGuard.assert(path.join(outside, 'secret.txt'))).rejects.toBeInstanceOf(
      ForbiddenPathError
    )
  })

  it('does not treat a sibling with a shared prefix as inside the root', async () => {
    pathGuard.grantRoot(root)
    await expect(pathGuard.assert(`${root}-other/file.md`)).rejects.toBeInstanceOf(
      ForbiddenPathError
    )
  })

  it('grants the containing folder when a single file is granted', async () => {
    const file = path.join(root, 'docs', 'a.md')
    pathGuard.grantFile(file)

    await expect(pathGuard.assert(file)).resolves.toContain('a.md')
    // Sibling assets must load, or every relative image in the document breaks.
    await expect(pathGuard.assert(path.join(root, 'docs', 'image.png'))).resolves.toBeTruthy()
    // The parent of that folder is still off limits.
    await expect(pathGuard.assert(path.join(root, 'elsewhere.md'))).rejects.toBeInstanceOf(
      ForbiddenPathError
    )
  })

  it('revokes a root again', async () => {
    pathGuard.grantRoot(root)
    pathGuard.revokeRoot(root)
    await expect(pathGuard.assert(path.join(root, 'docs', 'a.md'))).rejects.toBeInstanceOf(
      ForbiddenPathError
    )
  })

  it('rejects empty and non-string input', async () => {
    pathGuard.grantRoot(root)
    await expect(pathGuard.assert('')).rejects.toBeInstanceOf(ForbiddenPathError)
    await expect(pathGuard.assert('   ')).rejects.toBeInstanceOf(ForbiddenPathError)
  })

  it('isAllowed mirrors assert without throwing', async () => {
    pathGuard.grantRoot(root)
    await expect(pathGuard.isAllowed(path.join(root, 'docs', 'a.md'))).resolves.toBe(true)
    await expect(pathGuard.isAllowed(path.join(outside, 'secret.txt'))).resolves.toBe(false)
  })
})
