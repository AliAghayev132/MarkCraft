# MarkCraft — Architecture

This document explains how MarkCraft is built and, more importantly, *why*. It
is the reference for anyone changing the application: if a change contradicts
something here, the contradiction should be resolved deliberately rather than by
accident.

---

## 1. Process topology

```
┌─ MAIN (Node, full privilege) ─────────────────────────────────┐
│  window/     BrowserWindow, custom chrome, asset protocol      │
│  ipc/        typed handler registry, one module per domain     │
│  services/   fs · workspace · watcher · settings · recent      │
│              recovery · search · export/print · templates      │
│  security/   path-guard (allowlist) · atomic-write             │
│  util/       json-store · logger                               │
└──────────────────────────┬────────────────────────────────────┘
                           │ ipcMain.handle — typed, validated
┌──────────────────────────┴────────────────────────────────────┐
│  PRELOAD   contextBridge → window.api.*                        │
│            no ipcRenderer, no require, no dynamic channels     │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────┴────────────────────────────────────┐
│  RENDERER (sandboxed, no Node)                                 │
│   lib/       ← the ONLY layer allowed to import npm packages   │
│   services/  ← the ONLY layer allowed to touch window.api      │
│   store/     ← Redux Toolkit slices (serialisable state only)  │
│   i18n/      ← locale registry, translator, plural rules       │
│   features/  ← editor · explorer · tabs · search · commands …  │
│   components/← design-system primitives (ui/) and brand        │
└────────────────────────────────────────────────────────────────┘

src/shared/  ← IPC contract, domain types, pure utilities.
               Imported by all three. Depends on nothing.
```

The renderer/`window.api` boundary and the "no Node in the renderer" rule are
**enforced by ESLint**, not by convention — see `eslint.config.mjs`. A component
that reaches for `window.api` or `node:fs` fails the lint run.

---

## 2. Document model

### Markdown text is the single source of truth

```
                  ┌───────────────────────────┐
                  │  DocumentModel            │
                  │  content:      Markdown   │  ← canonical
                  │  savedContent: Markdown   │  ← what is on disk
                  │  stamp: {mtime,size,hash} │
                  └───────────┬───────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   Source view           Rich view              Preview
   CodeMirror 6          ProseMirror/Tiptap     remark→rehype→React
```

`content` and `savedContent` are two strings. Their inequality *is* the dirty
flag, which is what makes both the tab indicator and Revert exact rather than
heuristic.

### mdast is the interchange format

```
Markdown ──parse──▶ mdast ──▶ hast ──▶ HTML ──▶ ProseMirror
ProseMirror ──▶ HTML ──parse──▶ hast ──▶ mdast ──stringify──▶ Markdown
```

Both directions run through `remark`/`hast` and, crucially, through **one**
serialiser configuration. The rich editor cannot invent its own Markdown
dialect, so an edit made in WYSIWYG mode is byte-identical to the same edit made
in the source view.

See `renderer/features/editor/markdown/processor.ts` and
`renderer/features/editor/rich/bridge.ts`.

### Round-trip policy

Markdown is not a canonical serialisation: `*em*`/`_em_`, `- x`/`* x`, and ATX
vs setext headings all parse to the same AST. Anything that round-trips through
an AST therefore rewrites text the user never touched. Four rules contain this:

1. **Driver/follower, never bidirectional.** Exactly one surface drives at a
   time — the focused one. Followers are recomputed from it. There is no
   two-way binding, so no echo loops and no cursor churn.
2. **Re-serialise on handoff, not per keystroke.** Rich-editor edits are
   serialised on a debounce and on blur/mode-switch. A user who stays in the
   source view never sees their formatting rewritten.
3. **One pinned serialiser config**, surfaced in Settings → Markdown precisely
   *because* the rich editor normalises to it. The behaviour is a visible
   setting, not a hidden surprise.
4. **Preserve what Markdown cannot express.** `<u>`, `<mark>`, `<kbd>`, `<sub>`,
   `<sup>` and `<abbr>` survive as inline HTML rather than being silently
   flattened, and `findLossyConstructs()` warns before editing a document
   containing footnotes, reference links, front matter or raw HTML blocks.

`tests/rich-bridge.test.ts` is the executable form of this contract.

### Why these editor engines

**CodeMirror 6** for source, over Monaco: Monaco brings its own find widget,
context menu and suggestion UI, which is exactly what the design rules forbid,
and it costs ~5 MB. CodeMirror is headless, viewport-rendered (so large files
stay fast), and themeable entirely from CSS custom properties — which is why
switching theme is instant even with a large document open.

**ProseMirror (via Tiptap)** for the rich editor: its schema-constrained
document is what makes a lossless mdast mapping tractable at all, and
`prosemirror-history` gives real undo/redo rather than a hand-rolled stack.

---

## 3. IPC

`src/shared/ipc-contract.ts` is the single source of truth:

```ts
export interface IpcApi {
  'files:read':  { req: { path: string }; res: FileContent }
  'files:write': { req: WriteRequest;      res: WriteOutcome }
  …
}
```

- **Main** registers handlers through a typed `handle()` that checks the channel
  name and both payload types against the contract.
- **Preload** projects the contract onto `window.api.<namespace>.<method>`, and
  `MarkCraftApi` is *derived* from `IpcApi` — a new channel appears on the bridge
  automatically and fails to compile until it is implemented.
- **Renderer** consumes it only through `renderer/services`.

Nothing thrown ever crosses the bridge. Every call resolves to
`IpcResult<T> = {ok:true, data} | {ok:false, error:{code,…}}`, so the renderer
branches on a typed code instead of parsing a message string, and stack traces
(which leak absolute paths) stay in main.

---

## 4. Security model

Threat model: a Markdown file is untrusted input, and in Electron an injected
script is not a web XSS — it is potentially arbitrary filesystem access.

| Control | Where |
|---|---|
| `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` | `window/main-window.ts` |
| Fixed, enumerated preload surface — no `ipcRenderer`, no dynamic channels | `preload/index.ts` |
| **Path guard**: every path-bearing handler resolves symlinks and checks the real path against roots the *user* opened | `security/path-guard.ts` |
| HTML sanitisation with a strict allowlist, before rendering | `markdown/processor.ts` |
| Rendering to React elements — no `innerHTML` sink anywhere, including imported SVG icons | `markdown/render.tsx`, `features/icons/CustomSvgIcon.tsx` |
| CSP: strict in production (in the document, because `file://` ignores response headers), relaxed only for the dev server | `electron.vite.config.ts` |
| Navigation blocked; external links go to the OS browser after scheme validation | `window/main-window.ts` |
| Local images served over a private `mcfile://` scheme that re-checks the path guard, instead of disabling `webSecurity` | `window/asset-protocol.ts` |
| Permission requests denied except clipboard | `main/index.ts` |

**The path guard is the important one.** Without it, `files.read(path)` would
read anything on disk. With it, a renderer compromise is bounded to the folders
the user deliberately opened. Dropped files are granted through the preload,
which resolves paths from real `File` objects via `webUtils.getPathForFile` —
a path renderer script cannot fabricate.

### Grants, and the one exception

The guard starts **empty on every launch**. There are exactly three ways a path
enters it, and all three are a user action:

1. A native dialog returned it (`dialog-ipc.ts`).
2. It was dropped on the window (`webUtils.getPathForFile`, above).
3. It is **remembered** — a recent file, a pinned file, a recent workspace, or
   the workspace the last session was left in.

The third is the interesting one, because it is the renderer *asking* for a
grant. It is safe only because main decides from its own persisted records
rather than from the argument: `workspace:authorizeRemembered` grants nothing
unless the path is already in `recent.json`. The loop is closed at the other
end too — `addRecentFile`, `addRecentWorkspace` and `togglePin` refuse to record
a path that is not already reachable, so the renderer cannot write itself a
permission slip and then cash it.

Without (3), every entry in the recent list would fail to open after a restart.
Without the write-side check, (3) would be a hole straight through the guard.

`tests/path-guard.test.ts` covers traversal, symlinks, sibling-prefix
false-positives and non-existent paths.

---

## 5. Data safety

Three distinct failure modes, deliberately not conflated:

| Failure | Mechanism |
|---|---|
| **Crash / power loss** | A recovery journal in `userData/recovery/` holds dirty content, written on an idle tick and deleted the moment a document is saved. Untitled documents live here entirely. |
| **External modification** | `chokidar` watches only the open files and expanded folders. A change to a clean document reloads silently; a change to a dirty one raises a banner offering both options. |
| **Stale overwrite** | Every document carries a `FileStamp` (mtime, size, sha256). Writes send `expect`; main re-hashes immediately before writing and **aborts** on mismatch, returning the current stamp. Overwriting requires an explicit second call with `force`. |

All writes are atomic: staged to a sibling temp file, `fsync`'d, then renamed
over the target. A crash mid-write leaves either the old file or the new one.

Autosave, when enabled, goes through the same conflict-checked path as a manual
save and refuses to run while an external change is pending. It can never
silently clobber.

---

## 6. Performance

The decisions that matter, and what they are protecting against:

| Decision | Protects |
|---|---|
| Directories read **on expand**, never recursively | Opening a monorepo. Cost is proportional to what is on screen. |
| Explorer rows **virtualised** (fixed height, windowed) | 50,000-file workspaces. |
| Watcher follows only open files + expanded folders, capped | Descriptor exhaustion and CPU burn on large trees. |
| One `EditorState` cached per document; tab switching swaps state | Rebuilding a large document's editor state on every tab click — and losing undo history with it. |
| Preview render debounced (~130 ms) and memoised | Re-rendering a whole document on every keystroke. |
| Word count debounced, on `requestIdleCallback` | The most expensive thing the status bar does. |
| Toolbar samples editor state on an interval | Re-rendering the tree on every selection change. |
| Code grammars lazily imported per language | 16 languages of startup cost for a document with no code. |
| Search runs in **main**, streamed and bounded | Blocking the renderer while walking a filesystem. |
| Sidebar width written to a CSS variable during drag, persisted on release | Thrashing the settings file 60×/second. |

The renderer holds document text as plain strings in the store; the *editors*
stay uncontrolled and own their own state. Components subscribe with narrow
selectors, so typing re-renders the editor and nothing else.

---

## 7. State

Redux Toolkit, one slice per domain: `settings`, `documents`, `workspace`,
`toasts`, `ui`, `i18n`. Nothing else is global.

Every slice holds **only serialisable data**, which is what makes the store
inspectable and its integrity checks meaningful. The things that are not
serialisable live beside it rather than in it:

| Not in the store | Where it lives | Why |
|---|---|---|
| Toast actions, dialog resolvers | `store/callbacks.ts`, keyed by id | Functions cannot be serialised or time-travelled. |
| CodeMirror / Tiptap instances | `features/editor/editor-registry.ts` | Editor state is large, mutable and owned by the editor. |
| Context-menu JSX | `utils/external-store.ts` | React elements are not data. |
| Translation trees | `i18n/registry.ts` | Loaded once; a change re-renders through the `i18n` slice instead. |

The development-only `immutableCheck` and `serializableCheck` run with a
`warnAfter` budget rather than being switched off: a large document is a single
string and the explorer holds one entry per visible file, both cheap to store but
expensive to deep-scan on every dispatch. The checks still catch a genuine
mistake without adding a stall to every keystroke.

Cross-slice reads are `createSelector` memoised selectors in `store/selectors.ts`
— that is where, for example, the file tree combines the workspace with the
`files.markdownOnly` setting, so neither slice has to know about the other.

Code outside React (commands, services, actions) uses the non-reactive
`getState()` / `dispatch` exported from `@store`, so business logic is never
duplicated into a hook.

---

## 8. Internationalisation

Locales are JSON trees discovered by `import.meta.glob` at build time, so adding
a built-in language is *only* adding a file — there is no registration list to
forget. Users can add more at runtime by dropping a file into
`userData/languages/`, which is why a translation needs no toolchain.

A missing key falls back to English rather than rendering blank, so a partially
translated locale is still a usable interface — and the settings screen shows
each locale's coverage so the gaps are visible rather than surprising.
Pluralisation uses `Intl.PluralRules`, so a language with more than two forms is
supported without special-casing.

---

## 9. Design system

`renderer/styles/tokens.css` is the single source of colour, spacing, radius,
elevation, typography, motion and z-index. A literal hex or px value in a
component is a bug — it is the thing that cannot be themed.

Theming works by writing `data-theme`, `data-accent`, `data-density` and
`data-reduce-motion` onto the root element. No React re-render is involved,
which is why theme switching is instant.

**Tailwind is the authoring syntax; the tokens are still the source of truth.**
`styles/tailwind.css` bridges them in an `@theme inline` block —
`--color-surface: var(--mc-bg-surface)` and so on — so `bg-surface` resolves to
the live custom property rather than a compiled-in colour. That is what keeps a
theme, accent or density swap instant *and* keeps utilities from becoming a
second, competing palette. Utilities carrying raw values (`bg-[#1e2430]`) are the
same bug as a literal hex in CSS.

Two things are still hand-written CSS, for reasons that are not stylistic:
`tokens.css` (the tokens themselves) and `document.css` (the `.mc-document`
typography shared by the preview and the rich editor — that HTML is *generated*,
so it cannot carry utility classes).

Every visible control is a custom component (`components/ui`). Native
`alert`/`confirm`/`prompt` are never used; `dialogs.confirm()` and friends give
the same promise-based ergonomics backed by real modals with focus traps. The
native context menu is suppressed application-wide. `<select>` is replaced by a
custom listbox because it cannot be themed on Windows.

Native APIs *are* used behind the scenes where they are genuinely better or
unavoidable: file dialogs, the recycle bin, printing, and the macOS share sheet.

**Interface zoom** (`appearance.uiScale`) is a CSS `zoom` on the chrome only —
the sidebar and the settings screen — because the editor surfaces already have
their own font-size control, and one slider that moved both would make neither
adjustable alone. Anything that measures real screen pixels, such as the
sidebar's resize handle, is kept outside the zoomed subtree.

**The launch splash** is a separate frameless window loaded from a data URL, so
it can appear before Vite, React or any application code is touched — which is
the entire point, since what it covers is the renderer bundle being parsed. Its
3-second minimum is a floor, not a delay: the main window is created in parallel
and revealed the moment both it and the floor are ready. The chime is
synthesised with the Web Audio API rather than shipped as a file, so there is no
binary asset, no codec and no licence to carry.

It opens in the mode the application was last left in. Main resolves the theme
from settings (turning `system` into a concrete light or dark) and passes it in,
because that window can read neither the store nor the token file; the main
window's `backgroundColor` is set from the same value, so nothing flashes the
wrong colour before the first React paint. The splash duplicates four colour
literals to achieve this, which is a better trade than making the thing that
covers for the bundle depend on the bundle.

### Math and diagrams

`$…# MarkCraft — Architecture

This document explains how MarkCraft is built and, more importantly, *why*. It
is the reference for anyone changing the application: if a change contradicts
something here, the contradiction should be resolved deliberately rather than by
accident.

---

## 1. Process topology

```
┌─ MAIN (Node, full privilege) ─────────────────────────────────┐
│  window/     BrowserWindow, custom chrome, asset protocol      │
│  ipc/        typed handler registry, one module per domain     │
│  services/   fs · workspace · watcher · settings · recent      │
│              recovery · search · export/print · templates      │
│  security/   path-guard (allowlist) · atomic-write             │
│  util/       json-store · logger                               │
└──────────────────────────┬────────────────────────────────────┘
                           │ ipcMain.handle — typed, validated
┌──────────────────────────┴────────────────────────────────────┐
│  PRELOAD   contextBridge → window.api.*                        │
│            no ipcRenderer, no require, no dynamic channels     │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────┴────────────────────────────────────┐
│  RENDERER (sandboxed, no Node)                                 │
│   lib/       ← the ONLY layer allowed to import npm packages   │
│   services/  ← the ONLY layer allowed to touch window.api      │
│   store/     ← Redux Toolkit slices (serialisable state only)  │
│   i18n/      ← locale registry, translator, plural rules       │
│   features/  ← editor · explorer · tabs · search · commands …  │
│   components/← design-system primitives (ui/) and brand        │
└────────────────────────────────────────────────────────────────┘

src/shared/  ← IPC contract, domain types, pure utilities.
               Imported by all three. Depends on nothing.
```

The renderer/`window.api` boundary and the "no Node in the renderer" rule are
**enforced by ESLint**, not by convention — see `eslint.config.mjs`. A component
that reaches for `window.api` or `node:fs` fails the lint run.

---

## 2. Document model

### Markdown text is the single source of truth

```
                  ┌───────────────────────────┐
                  │  DocumentModel            │
                  │  content:      Markdown   │  ← canonical
                  │  savedContent: Markdown   │  ← what is on disk
                  │  stamp: {mtime,size,hash} │
                  └───────────┬───────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   Source view           Rich view              Preview
   CodeMirror 6          ProseMirror/Tiptap     remark→rehype→React
```

`content` and `savedContent` are two strings. Their inequality *is* the dirty
flag, which is what makes both the tab indicator and Revert exact rather than
heuristic.

### mdast is the interchange format

```
Markdown ──parse──▶ mdast ──▶ hast ──▶ HTML ──▶ ProseMirror
ProseMirror ──▶ HTML ──parse──▶ hast ──▶ mdast ──stringify──▶ Markdown
```

Both directions run through `remark`/`hast` and, crucially, through **one**
serialiser configuration. The rich editor cannot invent its own Markdown
dialect, so an edit made in WYSIWYG mode is byte-identical to the same edit made
in the source view.

See `renderer/features/editor/markdown/processor.ts` and
`renderer/features/editor/rich/bridge.ts`.

### Round-trip policy

Markdown is not a canonical serialisation: `*em*`/`_em_`, `- x`/`* x`, and ATX
vs setext headings all parse to the same AST. Anything that round-trips through
an AST therefore rewrites text the user never touched. Four rules contain this:

1. **Driver/follower, never bidirectional.** Exactly one surface drives at a
   time — the focused one. Followers are recomputed from it. There is no
   two-way binding, so no echo loops and no cursor churn.
2. **Re-serialise on handoff, not per keystroke.** Rich-editor edits are
   serialised on a debounce and on blur/mode-switch. A user who stays in the
   source view never sees their formatting rewritten.
3. **One pinned serialiser config**, surfaced in Settings → Markdown precisely
   *because* the rich editor normalises to it. The behaviour is a visible
   setting, not a hidden surprise.
4. **Preserve what Markdown cannot express.** `<u>`, `<mark>`, `<kbd>`, `<sub>`,
   `<sup>` and `<abbr>` survive as inline HTML rather than being silently
   flattened, and `findLossyConstructs()` warns before editing a document
   containing footnotes, reference links, front matter or raw HTML blocks.

`tests/rich-bridge.test.ts` is the executable form of this contract.

### Why these editor engines

**CodeMirror 6** for source, over Monaco: Monaco brings its own find widget,
context menu and suggestion UI, which is exactly what the design rules forbid,
and it costs ~5 MB. CodeMirror is headless, viewport-rendered (so large files
stay fast), and themeable entirely from CSS custom properties — which is why
switching theme is instant even with a large document open.

**ProseMirror (via Tiptap)** for the rich editor: its schema-constrained
document is what makes a lossless mdast mapping tractable at all, and
`prosemirror-history` gives real undo/redo rather than a hand-rolled stack.

---

## 3. IPC

`src/shared/ipc-contract.ts` is the single source of truth:

```ts
export interface IpcApi {
  'files:read':  { req: { path: string }; res: FileContent }
  'files:write': { req: WriteRequest;      res: WriteOutcome }
  …
}
```

- **Main** registers handlers through a typed `handle()` that checks the channel
  name and both payload types against the contract.
- **Preload** projects the contract onto `window.api.<namespace>.<method>`, and
  `MarkCraftApi` is *derived* from `IpcApi` — a new channel appears on the bridge
  automatically and fails to compile until it is implemented.
- **Renderer** consumes it only through `renderer/services`.

Nothing thrown ever crosses the bridge. Every call resolves to
`IpcResult<T> = {ok:true, data} | {ok:false, error:{code,…}}`, so the renderer
branches on a typed code instead of parsing a message string, and stack traces
(which leak absolute paths) stay in main.

---

## 4. Security model

Threat model: a Markdown file is untrusted input, and in Electron an injected
script is not a web XSS — it is potentially arbitrary filesystem access.

| Control | Where |
|---|---|
| `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` | `window/main-window.ts` |
| Fixed, enumerated preload surface — no `ipcRenderer`, no dynamic channels | `preload/index.ts` |
| **Path guard**: every path-bearing handler resolves symlinks and checks the real path against roots the *user* opened | `security/path-guard.ts` |
| HTML sanitisation with a strict allowlist, before rendering | `markdown/processor.ts` |
| Rendering to React elements — no `innerHTML` sink anywhere, including imported SVG icons | `markdown/render.tsx`, `features/icons/CustomSvgIcon.tsx` |
| CSP: strict in production (in the document, because `file://` ignores response headers), relaxed only for the dev server | `electron.vite.config.ts` |
| Navigation blocked; external links go to the OS browser after scheme validation | `window/main-window.ts` |
| Local images served over a private `mcfile://` scheme that re-checks the path guard, instead of disabling `webSecurity` | `window/asset-protocol.ts` |
| Permission requests denied except clipboard | `main/index.ts` |

**The path guard is the important one.** Without it, `files.read(path)` would
read anything on disk. With it, a renderer compromise is bounded to the folders
the user deliberately opened. Dropped files are granted through the preload,
which resolves paths from real `File` objects via `webUtils.getPathForFile` —
a path renderer script cannot fabricate.

### Grants, and the one exception

The guard starts **empty on every launch**. There are exactly three ways a path
enters it, and all three are a user action:

1. A native dialog returned it (`dialog-ipc.ts`).
2. It was dropped on the window (`webUtils.getPathForFile`, above).
3. It is **remembered** — a recent file, a pinned file, a recent workspace, or
   the workspace the last session was left in.

The third is the interesting one, because it is the renderer *asking* for a
grant. It is safe only because main decides from its own persisted records
rather than from the argument: `workspace:authorizeRemembered` grants nothing
unless the path is already in `recent.json`. The loop is closed at the other
end too — `addRecentFile`, `addRecentWorkspace` and `togglePin` refuse to record
a path that is not already reachable, so the renderer cannot write itself a
permission slip and then cash it.

Without (3), every entry in the recent list would fail to open after a restart.
Without the write-side check, (3) would be a hole straight through the guard.

`tests/path-guard.test.ts` covers traversal, symlinks, sibling-prefix
false-positives and non-existent paths.

---

## 5. Data safety

Three distinct failure modes, deliberately not conflated:

| Failure | Mechanism |
|---|---|
| **Crash / power loss** | A recovery journal in `userData/recovery/` holds dirty content, written on an idle tick and deleted the moment a document is saved. Untitled documents live here entirely. |
| **External modification** | `chokidar` watches only the open files and expanded folders. A change to a clean document reloads silently; a change to a dirty one raises a banner offering both options. |
| **Stale overwrite** | Every document carries a `FileStamp` (mtime, size, sha256). Writes send `expect`; main re-hashes immediately before writing and **aborts** on mismatch, returning the current stamp. Overwriting requires an explicit second call with `force`. |

All writes are atomic: staged to a sibling temp file, `fsync`'d, then renamed
over the target. A crash mid-write leaves either the old file or the new one.

Autosave, when enabled, goes through the same conflict-checked path as a manual
save and refuses to run while an external change is pending. It can never
silently clobber.

---

## 6. Performance

The decisions that matter, and what they are protecting against:

| Decision | Protects |
|---|---|
| Directories read **on expand**, never recursively | Opening a monorepo. Cost is proportional to what is on screen. |
| Explorer rows **virtualised** (fixed height, windowed) | 50,000-file workspaces. |
| Watcher follows only open files + expanded folders, capped | Descriptor exhaustion and CPU burn on large trees. |
| One `EditorState` cached per document; tab switching swaps state | Rebuilding a large document's editor state on every tab click — and losing undo history with it. |
| Preview render debounced (~130 ms) and memoised | Re-rendering a whole document on every keystroke. |
| Word count debounced, on `requestIdleCallback` | The most expensive thing the status bar does. |
| Toolbar samples editor state on an interval | Re-rendering the tree on every selection change. |
| Code grammars lazily imported per language | 16 languages of startup cost for a document with no code. |
| Search runs in **main**, streamed and bounded | Blocking the renderer while walking a filesystem. |
| Sidebar width written to a CSS variable during drag, persisted on release | Thrashing the settings file 60×/second. |

The renderer holds document text as plain strings in the store; the *editors*
stay uncontrolled and own their own state. Components subscribe with narrow
selectors, so typing re-renders the editor and nothing else.

---

## 7. State

Redux Toolkit, one slice per domain: `settings`, `documents`, `workspace`,
`toasts`, `ui`, `i18n`. Nothing else is global.

Every slice holds **only serialisable data**, which is what makes the store
inspectable and its integrity checks meaningful. The things that are not
serialisable live beside it rather than in it:

| Not in the store | Where it lives | Why |
|---|---|---|
| Toast actions, dialog resolvers | `store/callbacks.ts`, keyed by id | Functions cannot be serialised or time-travelled. |
| CodeMirror / Tiptap instances | `features/editor/editor-registry.ts` | Editor state is large, mutable and owned by the editor. |
| Context-menu JSX | `utils/external-store.ts` | React elements are not data. |
| Translation trees | `i18n/registry.ts` | Loaded once; a change re-renders through the `i18n` slice instead. |

The development-only `immutableCheck` and `serializableCheck` run with a
`warnAfter` budget rather than being switched off: a large document is a single
string and the explorer holds one entry per visible file, both cheap to store but
expensive to deep-scan on every dispatch. The checks still catch a genuine
mistake without adding a stall to every keystroke.

Cross-slice reads are `createSelector` memoised selectors in `store/selectors.ts`
— that is where, for example, the file tree combines the workspace with the
`files.markdownOnly` setting, so neither slice has to know about the other.

Code outside React (commands, services, actions) uses the non-reactive
`getState()` / `dispatch` exported from `@store`, so business logic is never
duplicated into a hook.

---

## 8. Internationalisation

Locales are JSON trees discovered by `import.meta.glob` at build time, so adding
a built-in language is *only* adding a file — there is no registration list to
forget. Users can add more at runtime by dropping a file into
`userData/languages/`, which is why a translation needs no toolchain.

A missing key falls back to English rather than rendering blank, so a partially
translated locale is still a usable interface — and the settings screen shows
each locale's coverage so the gaps are visible rather than surprising.
Pluralisation uses `Intl.PluralRules`, so a language with more than two forms is
supported without special-casing.

---

## 9. Design system

`renderer/styles/tokens.css` is the single source of colour, spacing, radius,
elevation, typography, motion and z-index. A literal hex or px value in a
component is a bug — it is the thing that cannot be themed.

Theming works by writing `data-theme`, `data-accent`, `data-density` and
`data-reduce-motion` onto the root element. No React re-render is involved,
which is why theme switching is instant.

**Tailwind is the authoring syntax; the tokens are still the source of truth.**
`styles/tailwind.css` bridges them in an `@theme inline` block —
`--color-surface: var(--mc-bg-surface)` and so on — so `bg-surface` resolves to
the live custom property rather than a compiled-in colour. That is what keeps a
theme, accent or density swap instant *and* keeps utilities from becoming a
second, competing palette. Utilities carrying raw values (`bg-[#1e2430]`) are the
same bug as a literal hex in CSS.

Two things are still hand-written CSS, for reasons that are not stylistic:
`tokens.css` (the tokens themselves) and `document.css` (the `.mc-document`
typography shared by the preview and the rich editor — that HTML is *generated*,
so it cannot carry utility classes).

Every visible control is a custom component (`components/ui`). Native
`alert`/`confirm`/`prompt` are never used; `dialogs.confirm()` and friends give
the same promise-based ergonomics backed by real modals with focus traps. The
native context menu is suppressed application-wide. `<select>` is replaced by a
custom listbox because it cannot be themed on Windows.

Native APIs *are* used behind the scenes where they are genuinely better or
unavoidable: file dialogs, the recycle bin, printing, and the macOS share sheet.

**Interface zoom** (`appearance.uiScale`) is a CSS `zoom` on the chrome only —
the sidebar and the settings screen — because the editor surfaces already have
their own font-size control, and one slider that moved both would make neither
adjustable alone. Anything that measures real screen pixels, such as the
sidebar's resize handle, is kept outside the zoomed subtree.

**The launch splash** is a separate frameless window loaded from a data URL, so
it can appear before Vite, React or any application code is touched — which is
the entire point, since what it covers is the renderer bundle being parsed. Its
3-second minimum is a floor, not a delay: the main window is created in parallel
and revealed the moment both it and the floor are ready. The chime is
synthesised with the Web Audio API rather than shipped as a file, so there is no
binary asset, no codec and no licence to carry.

It opens in the mode the application was last left in. Main resolves the theme
from settings (turning `system` into a concrete light or dark) and passes it in,
because that window can read neither the store nor the token file; the main
window's `backgroundColor` is set from the same value, so nothing flashes the
wrong colour before the first React paint. The splash duplicates four colour
literals to achieve this, which is a better trade than making the thing that
covers for the bundle depend on the bundle.

 and `$…$` are rendered by KaTeX inside the normal pipeline — two
remark/rehype plugins either side of `remark-rehype`, and a widened sanitiser
allowlist so the MathML survives. It costs ~480 KB in the startup graph, which
is the price of math working without a round trip.

Mermaid is different on both counts. It is an order of magnitude larger, and
rendering is *asynchronous*, which a hast transform cannot be — so a
```mermaid fence is detected at the React layer and rendered by a component
that imports the engine on demand. Nothing is loaded until a document contains
a diagram.

Mermaid returns an SVG **string**, and this application has no `innerHTML`
sink. The markup is parsed and rebuilt as React elements against an allowlist
(`features/icons/svg-tree.tsx`), shared with imported icons but with a wider
profile — text and markers are legitimate in a diagram, `foreignObject` and
scripts are not in either. Mermaid is configured with `htmlLabels: false` so
its labels stay inside that allowlist.

Its theme block is dropped, and the diagram is styled by `styles/document.css`
from the same tokens as everything else. That is both safer — no third-party
CSS is injected — and better: a diagram follows the user's theme instead of
carrying Mermaid's palette around.

---

## 10. Opening a document from the operating system

Double-clicking a `.md` file is a different intent from opening one inside the
app, and is treated as one.

**The timing is the hard part.** On Windows the paths are on `process.argv`
before the window exists; on macOS `open-file` fires before `whenReady`. Pushing
them at `did-finish-load` is *still* too early — the page has loaded but React
has not subscribed yet, so the event lands in the void and the user gets an
empty editor. So main queues them (`services/open-queue.ts`) and the renderer
**pulls**: `app:takePendingOpen` returns the queue and, by being called, is what
marks the renderer ready. Anything arriving after that is pushed as an event.

**Reading mode.** A launch opens the document in `features/reader` — the
rendered document, a word count, print, and an Edit button — because someone who
double-clicked a file in Explorer wants to read it, not to be handed a
split-pane editor with a file tree and a formatting toolbar. Files arriving
while the app is *already running* never do this: they become tabs, because
replacing a working session with a reader would be the wrong trade.

The association itself is registered by the installer (`electron-builder.yml`),
which is as far as it goes: Windows 10 and 11 do not let an application make
itself the *default* handler silently, and should not.

Leaving reading mode is not a reload. The document is already open; the editor
simply renders around it.

---

## 11. Command system

`features/commands/commands.tsx` defines every user-triggerable action once.
The palette, the keyboard shortcuts and the macOS menu are all front-ends onto
that one list. Adding a feature means adding one entry — not wiring three call
sites — and it is what makes shortcuts rebindable without touching any UI.

Accelerators are stored platform-neutrally (`mod+shift+p`) and resolved at match
time. User overrides are keyed by command id, so changing a default later does
not silently overwrite a user's choice.

---

## 12. Known trade-offs

Stated plainly, because they were chosen rather than overlooked:

1. **`frame: false` costs the Windows Snap Layouts hover menu.** Dragging to a
   screen edge still snaps. This is the price of the fully custom title bar.
2. **The rich editor renders the whole document.** Above ~512 KB it warns and
   lets the user proceed; the source view is viewport-rendered and stays fast at
   any size.
3. **PDF export uses `printToPDF`.** Excellent fidelity for prose; a heavier
   engine would be needed for exact typographic control, and the export service
   is structured so one could be added behind the same interface.
4. **The renderer bundle is ~4 MB.** It loads from local disk, so this costs
   parse time rather than download time. Splitting the rich editor into a lazy
   chunk is the obvious next win.
5. **Underline has no Markdown syntax.** It round-trips as `<u>`, which is valid
   Markdown but not portable to every renderer.

---

## 13. Designed for, not built

The architecture leaves room for these without reserving space for them:

- **Plugins / custom renderers** — the unified pipeline is already a plugin chain.
- **Mermaid, KaTeX** — additional rehype plugins in one place.
- **Shiki** — the `HighlightProvider` seam in `markdown/highlight.ts`.
- **Additional export formats** — one entry in `ExportModal` plus one handler.
- **Git integration, cloud sync** — new main services and IPC namespaces; no
  renderer surgery, because the renderer only knows the service layer.
- **Multiple workspaces / windows** — workspace state is already keyed per root.
