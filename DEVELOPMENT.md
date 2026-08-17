# MarkCraft — Development Guide

Practical notes for working on the codebase. For *why* things are built the way
they are, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Setup

```bash
npm install    # also downloads the Electron binary
npm run dev
```

Node 20+ is required. The package manager is **npm** — the version is pinned in
`package.json` and there is one lockfile; do not commit a second one.

---

## Project layout

```
src/
  shared/                 Imported by all three processes. Depends on nothing.
    ipc-contract.ts       The channel map — the source of truth for IPC
    api.ts                window.api's type, derived from the contract
    types/                Domain types (files, settings, workspace, search…)
    utils/                Pure helpers (path, format)

  main/
    index.ts              Lifecycle, CSP, single-instance, quit coordination
    window/               BrowserWindow, custom chrome, mcfile:// protocol
    ipc/                  One module per domain + the typed register()
    services/             fs, settings, recent, workspace, watcher,
                          recovery, search, export/print, doc template,
                          icons (user SVG library)
    security/             path-guard, atomic-write
    util/                 json-store, logger

  preload/index.ts        The entire trust boundary

  renderer/
    lib/                  The vendor boundary. Third-party packages are
                          re-exported here and imported as @lib/* elsewhere.
    components/brand/     Logo and wordmark (same artwork as build/icon.svg)
    components/ui/        The design system. Features import from here only.
    features/
      commands/           Registry, palette, shortcut resolution
      documents/          Open/save/close orchestration, autosave, recovery
      editor/             markdown/ · source/ · rich/ · preview/ · toolbar/
      explorer/           File tree and workspace mutations
      icons/              Icon rules, the picker, custom SVG rendering
      outline/            Heading parser and the table-of-contents panel
      stats/              Document statistics and the word goal
      templates/          Starter documents, built from translations
      reader/             The reading view a double-clicked document opens in
      output/             Export, print, share
      search/             Find bar and workspace search
      settings/           Settings screen, catalogue, sections, shortcut editor
      shell/              Title bar, sidebar, status bar, recent panel
      tabs/ welcome/ workspace/
    i18n/                 Locale registry, translator, React binding
    i18n/locales/         en.json · az.json · ru.json — add a file, add a language
    store/                Redux Toolkit slices, selectors, callback registry
    hooks/  services/  styles/  utils/
    */types.ts            Every folder's exported interfaces and type aliases

tests/                    Vitest suites
```

---

## Conventions

**Where does this code go?**

| It… | Belongs in |
|---|---|
| touches the filesystem, the OS, or a native dialog | `main/services` behind an IPC channel |
| calls `window.api` | `renderer/services` — and *only* there |
| decides something and may ask the user | `features/*/…-actions.ts` |
| holds state | `renderer/store/slices` |
| reads across two slices | `renderer/store/selectors.ts` |
| imports an npm package | `renderer/lib` — re-export it, import `@lib/*` |
| renders | `features/*/Component.tsx` |
| is a reusable control | `components/ui` |
| is needed by more than one process | `src/shared` (must stay pure) |
| is an exported `interface` or `type` | the folder's `types.ts` — never the implementation file |

**Rules enforced by ESLint** (`npm run lint`):

- The renderer may not import `electron`, `node:*`, `fs`, `path`, `os`.
- `window.api` may only appear under `renderer/services/**`.
- Third-party packages may only be imported from `renderer/lib/**`; everywhere
  else goes through `@lib/*`.
- `src/shared` may not import Node, Electron, main or renderer code.
- Main may not import renderer code.

**Styling.** Tailwind utilities, backed by the tokens. No literal colours or
pixel values in components and no arbitrary-value utilities carrying raw colours
— `bg-surface` and `text-ink-secondary` resolve to `styles/tokens.css` through
the `@theme inline` bridge in `styles/tailwind.css`, which is what makes theme
and accent switching instant. There are no CSS Modules.

**Imports** are grouped under a `// ── … ───` header that names *where they
come from*, not what they are for — the header is the alias, so the group and
the specifier below it always agree:

```ts
// ── @lib ───────────────────────────────────────────────────────────────────
import { useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { basename } from '@shared/utils/path'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils/cx'

// ── types ──────────────────────────────────────────────────────────────────
import type { SidebarProps } from '@features/shell/types'
```

Order, foundational first: `node:` · `electron` · `@lib` · `@shared` ·
`@i18n` · `@services` · `@store` · `@hooks` · `@ui` · `@components` ·
`@features` · `@utils` · `types`. The main process uses its own relative
paths in the same spirit: `./services`, `../security`, `../util`.

**Types live in `types.ts`.** Every exported `interface` and `type` belongs to
its folder's type module, not to the file that happens to use it — so the shape
of an area can be read in one place, and a prop type can be imported without
knowing which file the component lives in. The two exceptions are types that
*cannot* move: `RootState` derives from the store value itself, and
`shared/api.ts` and `shared/ipc-contract.ts` are type modules already.

**No native UI.** No `alert`/`confirm`/`prompt`, no `<select>`, no `title=`
tooltips, no default context menu. Use `dialogs.*`, `Select`, `Tooltip` and
`useContextMenu` respectively.

**No hard-coded English.** Every user-visible string goes through `t()`, and new
keys are added to all three locale files.

---

## Common tasks

### Add an IPC channel

1. Add the entry to `IpcApi` in `src/shared/ipc-contract.ts`.
2. Implement the handler in the matching `main/ipc/*-ipc.ts` with `handle()`.
3. Add the method name to the right namespace list in `preload/index.ts`.
4. Add an ergonomic wrapper in `renderer/services`.

Steps 1–3 are checked by the compiler: the build fails until all three agree.
If the channel takes a path, it **must** go through `pathGuard.assert()` — add
it to `PATH_BEARING_CHANNELS` too.

### Add a command (and therefore a palette entry and a shortcut)

Add one object to the array in `features/commands/commands.tsx`:

```ts
{
  id: 'file.duplicate',
  title: 'Duplicate Document',
  category: 'File',
  shortcut: 'mod+shift+d',
  icon: <Copy size={14} />,
  enabled: () => documents().activeId !== null,
  run: () => duplicateActiveDocument()
}
```

It appears in the palette, becomes rebindable in Settings → Keyboard, and its
accelerator starts working. Nothing else needs changing.

### Add a setting

1. Extend the interface and `DEFAULT_SETTINGS` in `shared/types/settings.ts`.
2. Add a `<SettingsRow id="section.key">` to the matching
   `features/settings/sections/*Section.tsx`, wrapping a control from `@ui`.
3. Add the label (and hint, if any) to all three files in `i18n/locales/`.
4. Add a row to `SETTINGS_CATALOGUE` in `features/settings/settings-catalogue.ts`
   with the **same id** — that is what makes it findable in settings search, and
   `tests/settings-search.test.ts` fails if its keys are missing a translation.
5. Read it with `useAppSelector((state) => state.settings.values.…)` and write it
   with `updateSettings({ … })`.

Bump `SETTINGS_VERSION` and add a `migrate` step only if the *shape* changes;
adding a new key needs neither, because `JsonStore` merges defaults on read.

### Add a language

Drop a JSON file into `renderer/i18n/locales/` — it is picked up by
`import.meta.glob`, so there is nothing to register. Give it a `$meta` block
(`code`, `name`, `nativeName`, `direction`); any key it omits falls back to
English, and Settings → Language shows its coverage.

Users can do the same at runtime without a rebuild: Settings → Language →
**Export template**, edit the file in `userData/languages/`, then **Reload**.

### Add an icon to the picker

Add the name to `ICON_LIBRARY` in `shared/types/icons.ts` and the component to
`ICON_COMPONENTS` in `features/icons/icon-library.ts` — the name is what a saved
rule refers to, so it must live in shared, and the component cannot. Import the
glyph in the icon-picker block of `renderer/lib/icons.ts`.

Users add their own without a rebuild: Settings → Icons → **Import SVG…**, which
copies the file into `userData/icons/`.

### Add a code language

- **Source editor** (fenced blocks): one entry in `editor/source/languages.ts`,
  with a dynamic `import()` so it stays lazily loaded.
- **Preview / export**: import the grammar in `editor/markdown/highlight.ts` and
  add it to the `createLowlight({...})` map.

---

## Testing

```bash
npm test           # once
npm run test:watch
```

The suite covers the places where a silent regression is expensive:

| File | Covers |
|---|---|
| `tests/rich-bridge.test.ts` | Markdown → rich HTML → Markdown. **The most important suite** — a failure here means the WYSIWYG editor damages documents. |
| `tests/markdown.test.ts` | Serialiser idempotence, normalisation detection, word counting |
| `tests/path-guard.test.ts` | Traversal, symlinks, sibling prefixes, revocation |
| `tests/path.test.ts` | Cross-platform path handling and filename validation |
| `tests/shortcuts.test.ts` | Accelerator parsing, matching, overrides, conflicts |
| `tests/settings-search.test.ts` | The settings catalogue: every entry translated, unique, findable |
| `tests/visible-tree.test.ts` | The explorer's Markdown-only filter |
| `tests/icon-rules.test.ts` | Icon-rule matching and precedence |
| `tests/icon-svg.test.ts` | **Both** SVG defences — what main strips on read, and what the renderer actually lets reach the DOM |
| `tests/i18n-coverage.test.ts` | az/ru cover every English key and keep its placeholders; `lookup` resolves dotted command ids |
| `tests/command-shortcuts.test.ts` | No two commands share an accelerator, and every command has a title |
| `tests/settings-migrations.test.ts` | The migration chain, and that a corrupt settings file cannot break the app |
| `tests/outline.test.ts` | Heading parsing — code fences, front matter, inline syntax |
| `tests/wiki-links.test.ts` | `[[note]]` expansion, and that it never rewrites code or existing links |

UI rendering is deliberately not unit-tested. If you add a Markdown construct or
touch the bridge, add a round-trip case.

---

## Debugging

- **Renderer DevTools** — `Ctrl+Shift+I`, or the `app.toggleDevTools` command.
- **Main process logs** — stdout from `npm run dev`.
- **Where is my data?** Settings → About shows the user-data folder. It contains
  `settings.json`, `recent.json`, `window-state.json`, `workspaces/` and
  `recovery/`. Deleting it resets the app; deleting `recovery/` discards
  unrecovered work.
- **Testing crash recovery** — edit a document without saving, then kill the
  process (Task Manager / `kill -9`). The next launch offers the work back.
- **Testing conflict handling** — open a file, edit it in MarkCraft *and* in
  another editor, then save in both.

---

## Troubleshooting

**`electron.exe` starts but behaves like plain Node, or `require('electron')`
returns a string.**
`ELECTRON_RUN_AS_NODE` is set in your shell. Some tooling sets it globally.
Clear it before launching:

```powershell
Remove-Item Env:\ELECTRON_RUN_AS_NODE
```

**`Cannot read properties of undefined (reading 'getPath')` on startup.**
The same cause as above.

**The Electron binary is missing after `npm install`.**
The postinstall download was skipped or blocked. Run it manually:

```bash
node node_modules/electron/install.js
```

**`tsc` reports options it should understand, or ignores `lib`.**
Do not put `//` comments in `tsconfig.*.json`. Some TypeScript versions' native
config reader mis-parses JSONC and silently drops the option that follows.

**Changing settings does nothing.**
Check the write reached main: the file in the user-data folder should update
within a second. Settings are applied optimistically in the renderer, so a
failed write shows as "works now, forgotten next launch".

---

## Before opening a pull request

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Then check by hand:

- Both light and dark themes.
- Keyboard-only operation of anything you touched, with visible focus.
- The narrow-window case — the sidebar and toolbar must stay usable.
