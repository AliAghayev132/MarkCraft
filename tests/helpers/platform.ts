/**
 * Pins the platform the shortcut code reads at import time.
 *
 * `shortcuts.ts` decides once, when it loads, whether `mod` means Ctrl or Cmd —
 * from `navigator.platform`. The tests used to stub that only when `navigator`
 * was undefined, which was true when they were written and has not been since
 * Node gained a built-in `navigator`. From then on they silently measured
 * whichever machine happened to run them: green on Windows and Linux, red on a
 * Mac, and nobody would have known until CI ran somewhere other than Ubuntu.
 *
 * Call this before importing anything that reads it.
 */
export function pinPlatform(platform: string): void {
  /*
   * Only the one property is redefined. Replacing the whole object — even by
   * spreading it — drops the accessors the real `navigator` keeps on its
   * prototype, and react-dom reads `navigator.userAgent` as it loads.
   */
  try {
    Object.defineProperty(globalThis.navigator, 'platform', {
      value: platform,
      configurable: true,
      writable: true
    })
    if (globalThis.navigator.platform === platform) return
  } catch {
    // Falls through to replacing the global below.
  }

  const current = globalThis.navigator
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      userAgent: current?.userAgent ?? 'node',
      language: current?.language ?? 'en-GB',
      platform
    },
    configurable: true,
    writable: true
  })
}
