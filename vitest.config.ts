import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const r = (p: string): string => resolve(__dirname, p)

/**
 * Tests target the parts where a silent regression is expensive: Markdown
 * round-tripping, the path guard, path handling, translation lookup and
 * shortcut resolution. Pixel-level UI is deliberately not tested (§54).
 *
 * The alias list mirrors `electron.vite.config.ts`. There is deliberately no
 * catch-all: `@*` would also match every scoped npm package.
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: '@shared', replacement: r('src/shared') },
      { find: '@main', replacement: r('src/main') },
      { find: '@icons', replacement: r('src/renderer/lib/icons') },
      { find: '@lib', replacement: r('src/renderer/lib') },
      { find: '@components', replacement: r('src/renderer/components') },
      { find: '@ui', replacement: r('src/renderer/components/ui') },
      { find: '@features', replacement: r('src/renderer/features') },
      { find: '@hooks', replacement: r('src/renderer/hooks') },
      { find: '@services', replacement: r('src/renderer/services') },
      { find: '@store', replacement: r('src/renderer/store') },
      { find: '@i18n', replacement: r('src/renderer/i18n') },
      { find: '@styles', replacement: r('src/renderer/styles') },
      { find: '@utils', replacement: r('src/renderer/utils') }
    ]
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: 'default'
  }
})
