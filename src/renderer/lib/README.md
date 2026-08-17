# `@lib` — the vendor boundary

Every third-party library the renderer uses is re-exported from a module in this
folder, and application code imports from here rather than from the package
directly.

## Why

- **One upgrade point.** A breaking change in CodeMirror or Tiptap is absorbed
  in one file instead of rippling through fifty imports.
- **A visible dependency budget.** `ls src/renderer/lib` is the complete list of
  what the renderer depends on. Adding a package is a deliberate act with a
  reviewable diff, not an incidental `npm install`.
- **Swappable engines.** The markdown and highlighting layers already have
  seams; routing them through `@lib` means replacing an engine touches this
  folder and nothing else.

This boundary is enforced by ESLint: a direct import of `react`, `@reduxjs/toolkit`, `react-redux`,
`lucide-react`, `@codemirror/*`, `@tiptap/*` or the unified ecosystem from
outside `@lib` fails the lint run.

## Why one file per library, not one big barrel

Each library gets its own module (`lib/react.ts`, `lib/state.ts`, …) rather than
everything being funnelled through a single `index.ts`.

A single barrel would force the bundler to consider the whole vendor surface as
one unit, which defeats tree-shaking and code splitting — the exact opposite of
what this project needs. Separate modules re-export named bindings, which Rollup
follows straight through to the original package, so the emitted bundle is
identical to importing directly.

`lib/index.ts` exists only for the handful of cross-cutting helpers; it does not
re-export the editors or the markdown pipeline.

## Layout

| Module | Wraps |
|---|---|
| `lib/react.ts` | React runtime, hooks and types |
| `lib/redux.ts` | Redux Toolkit and the react-redux bindings |
| `lib/icons.tsx` | The curated Lucide icon set |
| `lib/editor/codemirror.ts` | CodeMirror 6 state, view, commands, search, language |
| `lib/editor/languages.ts` | Lazily-loaded CodeMirror language grammars |
| `lib/editor/tiptap.ts` | Tiptap / ProseMirror core and extensions |
| `lib/markdown/unified.ts` | unified, remark, rehype and the sanitiser |
| `lib/markdown/hast.ts` | hast/mdast tree utilities |
| `lib/markdown/highlight.ts` | The lowlight instance and its grammar set |

## Adding a library

1. `npm install` it.
2. Add a module here that re-exports only the bindings the app actually uses.
3. Import it through `@lib/...` everywhere else.

Step 2 is the point: the narrow re-export is what documents *how much* of a
library the project has taken on.
