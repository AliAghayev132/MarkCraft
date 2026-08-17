import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

const r = (p: string): string => resolve(__dirname, p)

/**
 * Content Security Policy.
 *
 * A packaged renderer loads over `file://`, where `webRequest.onHeadersReceived`
 * does not reliably apply — so the production policy has to travel in the
 * document itself. The dev server needs `unsafe-eval` and a websocket for HMR,
 * which must never reach a shipped build; injecting per mode keeps the two
 * apart instead of shipping the loose one by accident.
 */
const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: mcfile:",
  "font-src 'self' data:",
  "media-src 'self' data: blob: mcfile:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ')

const DEVELOPMENT_CSP = [
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: mcfile:",
  "img-src 'self' data: blob: mcfile:",
  'connect-src ws: http://localhost:* http://127.0.0.1:*',
  "object-src 'none'",
  "frame-src 'none'"
].join('; ')

function cspPlugin(): Plugin {
  let isBuild = false

  return {
    name: 'markcraft-csp',
    configResolved(config) {
      isBuild = config.command === 'build'
    },
    transformIndexHtml(html) {
      const policy = isBuild ? PRODUCTION_CSP : DEVELOPMENT_CSP
      return html.replace(
        '<title>',
        `<meta http-equiv="Content-Security-Policy" content="${policy}" />\n    <title>`
      )
    }
  }
}

/**
 * `chokidar` (v5) ships ESM-only. The main process is emitted as CJS so that the
 * sandboxed preload stays loadable, therefore chokidar must be bundled rather
 * than externalised. It is pure JS with no native bindings, so this is safe.
 */
const BUNDLED_MAIN_DEPS = ['chokidar', 'readdirp']

/**
 * Mermaid, plus the layout and colour libraries only it uses. Left out of the
 * manual chunk map so Rollup can keep them in the async chunk.
 */
const DIAGRAM_DEPS = [
  '/mermaid/',
  '/d3',
  '/dagre',
  '/cytoscape',
  '/khroma/',
  '/roughjs/',
  '/langium/',
  '/delaunator/',
  '/robust-predicates/',
  '/internmap/',
  '/rw/',
  '/marked/',
  '/dayjs/',
  '/@braintree/',
  '/@iconify',
  '/@mermaid-js/',
  '/stylis/',
  '/ts-dedent/',
  '/uuid/',
  '/chevrotain/',
  '/vscode-'
]

/**
 * The unified/micromark ecosystem's helpers, which share no name prefix with
 * the packages that use them. They have to be chunked alongside the pipeline —
 * see the note on `manualChunks`.
 */
const PIPELINE_HELPERS = [
  '/vfile',
  '/bail/',
  '/trough/',
  '/devlop/',
  '/zwitch/',
  '/longest-streak/',
  '/ccount/',
  '/character-entities',
  '/character-reference-invalid/',
  '/decode-named-character-reference/',
  '/parse-entities/',
  '/stringify-entities/',
  '/property-information/',
  '/space-separated-tokens/',
  '/comma-separated-tokens/',
  '/html-void-elements/',
  '/web-namespaces/',
  '/markdown-table/',
  '/collapse-white-space/',
  '/is-alphabetical/',
  '/is-decimal/',
  '/is-hexadecimal/',
  '/is-plain-obj/',
  // These are hast/unified members whose names carry no shared prefix at all.
  '/hastscript/',
  '/@ungap/structured-clone/',
  '/estree-util-',
  '/inline-style-parser/',
  '/escape-string-regexp/',
  '/extend/',
  // The HTML half of the pipeline: rehype parses through parse5 and converts
  // inline styles through style-to-js.
  '/parse5',
  '/style-to-js/',
  '/style-to-object/',
  '/trim-lines/',
  '/trim-trailing-lines/'
]

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: BUNDLED_MAIN_DEPS })],
    resolve: {
      alias: {
        '@shared': r('src/shared'),
        '@main': r('src/main')
      }
    },
    build: {
      rollupOptions: {
        input: { index: r('src/main/index.ts') }
      }
    }
  },

  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': r('src/shared')
      }
    },
    build: {
      rollupOptions: {
        input: { index: r('src/preload/index.ts') }
      }
    }
  },

  renderer: {
    root: r('src/renderer'),
    plugins: [react(), tailwindcss(), cspPlugin()],
    resolve: {
      /*
       * Every alias is named. There is deliberately no catch-all: `@*` would
       * match `@tiptap/core` and every other scoped package as eagerly as it
       * matches our own folders, and resolve them into src/renderer.
       */
      alias: [
        { find: '@shared', replacement: r('src/shared') },
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
    build: {
      rollupOptions: {
        input: { index: r('src/renderer/index.html') },
        output: {
          /*
           * Vendor code is split by *when it is needed*, not by package.
           *
           * The shell (React, the store, the icon set) is required to paint
           * anything at all. The editors and the markdown pipeline are needed
           * only once a document is open, and the rich editor only once the
           * user switches into it — so each gets its own chunk and the first
           * paint no longer waits on ~2 MB of editor engine.
           */
          /*
           * The unified ecosystem's small helpers do not share a name prefix
           * with it. Left to the catch-all they landed in `vendor`, which then
           * imported `vendor-markdown` while `vendor-markdown` imported them
           * back — the circular chunk Rollup was warning about. They belong
           * with the pipeline they exist to serve.
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined

            /*
             * Mermaid and everything it drags in stay unassigned on purpose.
             * Naming a chunk here merges it with statically-reachable code and
             * makes it a startup preload — which is the opposite of the point,
             * since it is reached only through a dynamic import and only when a
             * document actually contains a diagram.
             */
            if (DIAGRAM_DEPS.some((dep) => id.includes(dep))) return undefined

            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-rich-editor'
            if (id.includes('@codemirror') || id.includes('@lezer')) return 'vendor-source-editor'
            if (id.includes('highlight.js') || id.includes('lowlight')) return 'vendor-highlight'
            if (
              id.includes('/unified/') ||
              id.includes('/remark-') ||
              id.includes('/rehype-') ||
              id.includes('/mdast-') ||
              id.includes('/hast-') ||
              id.includes('/micromark') ||
              id.includes('/unist-') ||
              id.includes('/katex/') ||
              PIPELINE_HELPERS.some((dep) => id.includes(dep))
            ) {
              return 'vendor-markdown'
            }
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'vendor-react'
            }

            return 'vendor'
          }
        }
      },
      chunkSizeWarningLimit: 1200,
      // Source maps make a packaged crash report readable without shipping the
      // sources themselves.
      sourcemap: false
    }
  }
})
