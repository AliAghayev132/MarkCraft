// ── electron ───────────────────────────────────────────────────────────────
import { type BrowserWindow, screen } from 'electron'

// ── ../util ────────────────────────────────────────────────────────────────
import { JsonStore } from '../util/json-store'

interface Bounds {
  x: number | null
  y: number | null
  width: number
  height: number
  maximized: boolean
}

const DEFAULTS: Bounds = { x: null, y: null, width: 1320, height: 860, maximized: false }

const store = new JsonStore<Bounds>({
  file: 'window-state.json',
  defaults: DEFAULTS,
  version: 1,
  debounceMs: 500
})

export async function loadWindowBounds(): Promise<Bounds> {
  const saved = await store.read()

  // A monitor may have been unplugged since last run; snap back to the primary
  // display rather than opening the window off-screen.
  if (saved.x !== null && saved.y !== null) {
    const visible = screen.getAllDisplays().some((display) => {
      const { x, y, width, height } = display.workArea
      return (
        (saved.x as number) < x + width &&
        (saved.x as number) + saved.width > x &&
        (saved.y as number) < y + height &&
        (saved.y as number) + saved.height > y
      )
    })
    if (!visible) return { ...saved, x: null, y: null }
  }

  return saved
}

export function trackWindowBounds(window: BrowserWindow): void {
  const persist = (): void => {
    if (window.isDestroyed()) return
    const maximized = window.isMaximized()
    // Never persist maximized bounds as the restore size.
    const bounds = maximized ? null : window.getNormalBounds()

    void store.update((current) => ({
      x: bounds ? bounds.x : current.x,
      y: bounds ? bounds.y : current.y,
      width: bounds ? bounds.width : current.width,
      height: bounds ? bounds.height : current.height,
      maximized
    }))
  }

  window.on('resize', persist)
  window.on('move', persist)
  window.on('maximize', persist)
  window.on('unmaximize', persist)
  window.on('close', persist)
}

export async function flushWindowState(): Promise<void> {
  await store.flush()
}
