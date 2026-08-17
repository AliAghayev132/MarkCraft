/**
 * SVG sanitisation, on the way in.
 *
 * A pure string transform with no Electron or filesystem dependency, so it sits
 * beside the other security primitives rather than inside the icons service —
 * and so it can be tested without booting anything.
 *
 * This is the *first* of two lines. The renderer's `parseIconSource` is the one
 * that actually decides what reaches the DOM, rebuilding the file as React
 * elements against an allowlist. This pass exists because a `<script>` inside
 * an SVG downloaded from the internet is common enough to be worth removing at
 * the door, and because the file is stored on disk after it passes here.
 *
 * It is deliberately a blunt instrument. Anything it misses is caught by the
 * allowlist downstream; nothing here is load-bearing on its own.
 */
export function sanitiseSvg(source: string): string {
  return (
    source
      .replace(/<\?xml[\s\S]*?\?>/gi, '')
      .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      // Executable content.
      .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<script[^>]*\/>/gi, '')
      // A foreignObject can carry arbitrary HTML, including an iframe.
      .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
      // Remote content.
      .replace(/<image\b[^>]*>/gi, '')
      // Event handlers, in either quote style.
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
      // Script and data URLs on the attributes that can navigate or embed.
      .replace(/(href|xlink:href)\s*=\s*"\s*(javascript|data):[^"]*"/gi, '')
      .replace(/(href|xlink:href)\s*=\s*'\s*(javascript|data):[^']*'/gi, '')
      .trim()
  )
}
