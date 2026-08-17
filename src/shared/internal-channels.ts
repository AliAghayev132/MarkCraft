/**
 * Channels used by the preload bridge itself rather than by application code.
 * They are intentionally kept out of `IpcApi` so they are never projected onto
 * `window.api` and cannot be called directly from renderer script.
 */
export const INTERNAL_GRANT_PATHS = 'internal:grantDroppedPaths'
