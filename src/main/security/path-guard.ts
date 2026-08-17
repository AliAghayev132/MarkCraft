// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'

// ── @shared ────────────────────────────────────────────────────────────────
import { isDescendantPath, pathKey } from '@shared'

/**
 * The single choke point for filesystem authorisation.
 *
 * Nothing the renderer names is trusted. A path is only reachable if it lives
 * under a root the *user* opened (a workspace folder, or the folder of a file
 * they picked in a native dialog / dropped onto the window). Symlinks are
 * resolved before the check so a link inside the workspace cannot be used to
 * escape it.
 *
 * Consequence of a renderer compromise is therefore bounded to the folders the
 * user deliberately opened, instead of the whole disk.
 */
class PathGuard {
  private readonly roots = new Map<string, string>()
  private readonly files = new Map<string, string>()

  grantRoot(target: string): void {
    const resolved = path.resolve(target)
    this.roots.set(pathKey(resolved), resolved)
  }

  /**
   * Grants a single file plus its containing folder. Opening `notes.md` has to
   * make `./images/diagram.png` loadable, otherwise every relative image in the
   * document breaks — so the folder, not just the file, is the useful unit.
   */
  grantFile(target: string): void {
    const resolved = path.resolve(target)
    this.files.set(pathKey(resolved), resolved)
    this.grantRoot(path.dirname(resolved))
  }

  revokeRoot(target: string): void {
    this.roots.delete(pathKey(path.resolve(target)))
  }

  reset(): void {
    this.roots.clear()
    this.files.clear()
  }

  listRoots(): string[] {
    return [...this.roots.values()]
  }

  /**
   * Resolves `target` to a real path (following symlinks as far as the path
   * exists) and throws `ForbiddenPathError` if it is not inside a granted root.
   * Safe to call for paths that do not exist yet — creating a file inside an
   * allowed folder is a legitimate operation.
   */
  async assert(target: string): Promise<string> {
    if (typeof target !== 'string' || target.trim() === '') {
      throw new ForbiddenPathError(String(target), 'Empty path')
    }

    const resolved = await this.realpathTolerant(path.resolve(target))

    if (this.files.has(pathKey(resolved))) return resolved

    for (const root of this.roots.values()) {
      if (isDescendantPath(root, resolved)) return resolved
    }

    throw new ForbiddenPathError(resolved)
  }

  async assertAll(targets: string[]): Promise<string[]> {
    return Promise.all(targets.map((t) => this.assert(t)))
  }

  /** True without throwing — for cheap UI-side checks such as tree filtering. */
  async isAllowed(target: string): Promise<boolean> {
    try {
      await this.assert(target)
      return true
    } catch {
      return false
    }
  }

  /**
   * `fs.realpath` throws for non-existent paths. We walk up to the nearest
   * existing ancestor, resolve that, then re-append the missing tail — so a
   * symlinked workspace still resolves correctly when creating new files.
   */
  private async realpathTolerant(resolved: string): Promise<string> {
    const segments: string[] = []
    let current = resolved

    for (;;) {
      try {
        const real = await fs.realpath(current)
        return segments.length ? path.join(real, ...segments.reverse()) : real
      } catch {
        const parent = path.dirname(current)
        if (parent === current) return resolved
        segments.push(path.basename(current))
        current = parent
      }
    }
  }
}

export class ForbiddenPathError extends Error {
  readonly code = 'FORBIDDEN_PATH'
  readonly targetPath: string

  constructor(targetPath: string, detail?: string) {
    super(detail ?? `Access to "${targetPath}" is outside the opened workspace.`)
    this.name = 'ForbiddenPathError'
    this.targetPath = targetPath
  }
}

export const pathGuard = new PathGuard()
