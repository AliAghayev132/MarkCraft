/// <reference types="vite/client" />

// ── @shared ────────────────────────────────────────────────────────────────
import type { MarkCraftApi } from '@shared'

declare global {
  interface Window {
    /** The preload bridge. The only route from the renderer to the OS. */
    readonly api: MarkCraftApi
    readonly markcraftVersions: Readonly<Record<string, string>>
  }
}

export {}
