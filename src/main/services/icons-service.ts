// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { BrowserWindow, app, dialog, shell } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import type { CustomIcon } from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { sanitiseSvg } from '../security/sanitise-svg'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

/**
 * User-supplied icons.
 *
 * An `icons` folder in the app's data directory holds plain `.svg` files. They
 * are read as *text* and handed to the renderer, which parses them with the
 * DOM's own XML parser and rebuilds them as React elements — the markup is
 * never assigned to `innerHTML` anywhere, so an icon file cannot become a
 * script injection vector.
 *
 * This function sanitises as well, as defence in depth rather than as the only
 * line: by the time a file gets here the user has deliberately imported it, but
 * a `<script>` inside an SVG downloaded from the internet is common enough to
 * be worth removing at the door.
 */
/** Icons are small. Anything larger is a mistake, not an icon. */
const MAX_ICON_BYTES = 256 * 1024

/** Keeps a filename from escaping the icons folder or colliding with a rule. */
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,63}$/

export function iconsDirectory(): string {
  return path.join(app.getPath('userData'), 'icons')
}

export async function ensureIconsDirectory(): Promise<string> {
  const dir = iconsDirectory()
  await fs.mkdir(dir, { recursive: true })

  const readme = path.join(dir, 'README.txt')
  try {
    await fs.access(readme)
  } catch {
    await fs.writeFile(readme, README_TEXT, 'utf8').catch(() => undefined)
  }

  return dir
}

export async function listCustomIcons(): Promise<CustomIcon[]> {
  const dir = iconsDirectory()
  const icons: CustomIcon[] = []

  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return icons
  }

  for (const name of names.sort()) {
    if (!name.toLowerCase().endsWith('.svg')) continue

    const id = name.slice(0, -'.svg'.length)
    if (!SAFE_ID.test(id)) {
      logger.warn(`icons: skipping "${name}" — unsupported characters in the name`)
      continue
    }

    const file = path.join(dir, name)

    try {
      const stat = await fs.stat(file)
      if (stat.size > MAX_ICON_BYTES) {
        logger.warn(`icons: skipping "${name}" — larger than 256 KB`)
        continue
      }

      const raw = await fs.readFile(file, 'utf8')
      const source = sanitiseSvg(raw)
      if (!source.includes('<svg')) {
        logger.warn(`icons: skipping "${name}" — no <svg> element`)
        continue
      }

      icons.push({ id, name: id, path: file, source })
    } catch (error) {
      logger.warn(`icons: could not read "${name}"`, error)
    }
  }

  return icons
}

/**
 * Native picker, then copy in.
 *
 * The files are copied rather than referenced so an icon keeps working after
 * the original is moved or deleted, and so the icons folder is the single
 * place to look.
 */
export async function importCustomIcons(): Promise<CustomIcon[]> {
  const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
  const options: Electron.OpenDialogOptions = {
    title: 'Import SVG icons',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'SVG', extensions: ['svg'] }]
  }

  const result = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled) return listCustomIcons()

  const dir = await ensureIconsDirectory()

  for (const source of result.filePaths) {
    const base = path.basename(source, path.extname(source))
    const id = safeId(base)

    try {
      const stat = await fs.stat(source)
      if (stat.size > MAX_ICON_BYTES) {
        logger.warn(`icons: refusing "${base}" — larger than 256 KB`)
        continue
      }

      const raw = await fs.readFile(source, 'utf8')
      await fs.writeFile(path.join(dir, `${await uniqueId(dir, id)}.svg`), sanitiseSvg(raw), 'utf8')
    } catch (error) {
      logger.warn(`icons: could not import "${source}"`, error)
    }
  }

  return listCustomIcons()
}

export async function removeCustomIcon(id: string): Promise<CustomIcon[]> {
  if (!SAFE_ID.test(id)) return listCustomIcons()

  await fs.rm(path.join(iconsDirectory(), `${id}.svg`), { force: true }).catch(() => undefined)
  return listCustomIcons()
}

export async function revealIconsDirectory(): Promise<void> {
  const dir = await ensureIconsDirectory()
  await shell.openPath(dir)
}

/** Reduces an arbitrary filename to something that can live in a rule. */
function safeId(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '-').replace(/^-+/, '').slice(0, 64)
  return cleaned.length > 0 ? cleaned : 'icon'
}

/** Suffixes the name rather than overwriting an icon a rule may point at. */
async function uniqueId(dir: string, id: string): Promise<string> {
  let candidate = id

  for (let n = 2; n < 100; n++) {
    try {
      await fs.access(path.join(dir, `${candidate}.svg`))
      candidate = `${id}-${n}`
    } catch {
      return candidate
    }
  }

  return `${id}-${Date.now()}`
}

const README_TEXT = `MarkCraft — custom icons
========================

Drop .svg files in this folder to add them to the icon picker
(Settings > Icons, or right-click a file or folder > "Icon and colour...").

  * One icon per file. The filename becomes the icon's name.
  * Keep them small and square — 24x24 with a viewBox is ideal.
  * An icon drawn with "currentColor" will follow the colour you choose;
    one with hard-coded colours keeps its own.
  * Scripts and event handlers are stripped when the file is read.

Files added here appear after you press "Reload" in Settings > Icons.
`
