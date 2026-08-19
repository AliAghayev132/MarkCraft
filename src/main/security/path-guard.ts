// ── node: ──────────────────────────────────────────────────────────────────
import { realpath as realpathCallback, realpathSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

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
    const resolved = realOf(path.resolve(target))
    this.roots.set(pathKey(resolved), resolved)
  }

  /**
   * Grants a single file plus its containing folder. Opening `notes.md` has to
   * make `./images/diagram.png` loadable, otherwise every relative image in the
   * document breaks — so the folder, not just the file, is the useful unit.
   */
  grantFile(target: string): void {
    const resolved = realOf(path.resolve(target))
    this.files.set(pathKey(resolved), resolved)
    this.grantRoot(path.dirname(resolved))
  }

  revokeRoot(target: string): void {
    this.roots.delete(pathKey(realOf(path.resolve(target))))
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
        const real = await realpathNative(current)
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

/*
 * The operating system's own resolver, on both sides of the check.
 *
 * Node ships two implementations. The default is JavaScript with a cache, and
 * on Windows it does not follow a junction the way the native one does — so a
 * grant resolved by one and a target resolved by the other disagreed about the
 * same folder. Junctions are not exotic there: OneDrive uses them, and so do
 * several paths under `C:\Users`.
 *
 * Which of the two is "right" does not matter. Using one everywhere does.
 */
const realpathNative = promisify(realpathCallback.native)

/**
 * A granted path, in the same space the checks are made in.
 *
 * `assert` resolves what it is given through `realpath`, so a grant that was
 * not resolved lived somewhere else entirely and never matched. That is not a
 * corner case: on macOS the temporary directory is `/var` symlinked to
 * `/private/var`, on Windows a path can arrive in its 8.3 short form, and on
 * any platform a workspace kept behind a symlink — notes linked into a synced
 * folder, say — is ordinary. The workspace simply refused to open its own
 * files.
 *
 * Synchronous on purpose: grants happen when the user picks a folder or a file,
 * a handful of times per session, while `assert` runs on every read. The
 * expensive side stays async; this one buys correctness for a few syscalls.
 *
 * Falls back to the resolved-but-not-real path when the target does not exist
 * yet — `assert` walks up to the nearest existing ancestor for the same
 * reason, so the two still meet.
 */
function realOf(resolved: string): string {
  try {
    return realpathSync.native(resolved)
  } catch {
    return resolved
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
