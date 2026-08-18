// ── types ──────────────────────────────────────────────────────────────────
import type { GuideSection } from './types'

/** The English guide. See `guide-az.ts` for why it is written as Markdown. */
export const GUIDE_EN: GuideSection[] = [
  {
    id: 'start',
    title: 'Getting started',
    markdown: `# Getting started

MarkCraft is **folder-based**. You can open a single file, but the application comes alive with a folder open: the tree, workspace search, the link graph and book mode are all about the folder.

## First steps

1. **Open a folder** — \`Ctrl+Shift+O\`, or "Open folder" on the welcome screen.
2. **Create a document** — \`Ctrl+N\`. It is called "Untitled" until you save it.
3. **Save** — \`Ctrl+S\`.

## Three views, one document

| View | What it is |
|---|---|
| **Rich editor** | No syntax on screen; the text looks the way you wrote it |
| **Source** | Raw Markdown, line numbers, syntax colouring |
| **Split** | Source on the left, live preview on the right |

\`Ctrl+Shift+V\` cycles them.

> [!NOTE]
> These are **three views of one document**, not three copies. What you type in the rich editor is Markdown immediately, and the other way round. A round trip through the rich editor does not reformat your Markdown.

## The sidebar

The rail has two groups separated by a rule:

- **Above** — things that change what is *in* the panel: files, outline, search, recent, trash
- **Below** — tools that cover the whole window: book, canvas, study, links, presentation, developer tools

Clicking the active button collapses the panel.

## How to find anything

\`Ctrl+Shift+P\` — the **command palette**. Every action in the application is one searchable list, so you never have to remember a shortcut; typing the name is enough.`
  },

  {
    id: 'canvas',
    title: 'Canvas',
    markdown: `# Canvas

A canvas is an **infinite surface**: cards sit on it, and lines run between them. A document is linear — first paragraph, second paragraph. A canvas is not: it is for putting ideas beside each other and *seeing* how they relate.

## When to use it

- Scattering ideas before you start writing
- Laying the parts of a subject side by side to find its structure
- Seeing on a board how several documents connect
- Grouping research notes by theme

It is not a replacement for a document — it is **preparation for one**.

## Opening it

The **canvas icon** in the sidebar, or \`Ctrl+Shift+P\` → "Canvas".

The canvas is stored as **\`canvas.canvas\`** inside the open folder. If the file is not there, an empty canvas opens and the file is created on the first save.

> [!IMPORTANT]
> A canvas needs **a folder open** — without one there is nowhere to save it.

## Controls

| Action | How |
|---|---|
| **Pan** | Drag from empty space |
| **Zoom** | Mouse wheel — the point under the cursor stays put |
| **Move a card** | Drag it; it settles onto a 20-pixel grid |
| **Select a card** | Click it — a blue ring appears |
| **Write in a card** | Double-click it, or select it and press \`Enter\`. Clicking away keeps the change, \`Escape\` abandons it |
| **Resize a card** | Drag the small square at its bottom-right corner |
| **Join two cards** | Drag from one of the four round handles on a selected card onto another card |
| **Delete a card** | Select, then \`Delete\` or \`Backspace\` — the lines that reached it go too |
| **Add a card** | The "Add card" button at the top; it opens ready to be written in |
| **Add a group** | The group icon — it wraps the selected card, or drops an empty frame |
| **Undo** | \`Ctrl+Z\`, or the undo icon. A whole drag is one step back, not one per pixel |
| **Fit to view** | The expand icon — scales so everything is visible |
| **Save** | \`Ctrl+S\`, or the save icon |

The header shows the **card count and zoom level**. A dot next to the file name means there are unsaved changes.

## Cards hold Markdown

A card is not a plain text box — it **renders Markdown**. A card can contain a heading, bold text, a list, even a table:

\`\`\`md
## The main point

- first argument
- second argument
\`\`\`

That keeps the canvas in the same language as your documents: paste a card's text into one and it looks the same there.

## The file format — JSON Canvas

The canvas is saved as **JSON Canvas**, the **open format Obsidian writes**.

What that means for you:

- A canvas made here **opens in Obsidian**
- A canvas made in Obsidian **opens here**
- The file is ordinary JSON — open it in a text editor if you like
- Your work is **not trapped** inside this application

A private format would have been easier for us to write and would have tied your work to us.

## Current limits

Stated plainly, because the file format supports these but the **interface does not yet**:

- **Editing a card's text on the canvas** is not possible — the text is rendered, not edited. To change it, open \`canvas.canvas\` in a text editor.
- **Drawing a new line between cards** is not possible — existing lines are drawn, new ones cannot be made.
- **Creating groups** is not possible, though groups made elsewhere are shown.

Which side a line leaves from is chosen automatically: it always leaves the side facing the other card, so it never crosses over its own card.`
  },

  {
    id: 'writing',
    title: 'Writing',
    markdown: `# Writing

## The \`/\` block menu

Type **\`/\`** at the start of a line or after a space — a menu of fourteen blocks opens:

headings · bullet list · numbered list · task list · quote · code block · callout · table · link · image · emoji · divider

Keep typing to narrow it. **Enter** or **Tab** inserts; **Escape** closes and keeps what you typed.

Both the English name and your own language match — \`/heading\` and \`/başlıq\` both work.

> [!TIP]
> The menu stays closed inside file paths (\`src/renderer\`) and URLs. A slash only counts at the start of a line or after a space.

## The toolbar

The strip above the editor. **Which buttons appear, and in what order**, is yours to choose in Settings → Appearance.

## Templates

\`Ctrl+Alt+N\` starts a document from a shape: meeting notes, article, to-do. The templates are **translated**, not English boilerplate.

## Emoji

\`Ctrl+Alt+M\`, the toolbar, or \`/emoji\`. Search by name; your most-used stay at the top.

## Word goals

Set a target for a document in the statistics panel and the status bar tracks it. The target belongs to **the document**, not the application: one number for every file you ever open is not a goal, it is a nag.

## Writing streak

The statistics panel counts the days you wrote, with four weeks of squares.

One decision worth knowing: **a streak that ended yesterday still counts today**. If you have not started this morning you have not broken anything. It breaks only once a whole day has passed unwritten.

The record holds **a date and a number** — never a filename.`
  },

  {
    id: 'markdown',
    title: 'Markdown features',
    markdown: `# Markdown features

## Callouts

Put a label at the start of a quote:

\`\`\`md
> [!NOTE]
> An ordinary note.

> [!WARNING]
> Something that needs care.
\`\`\`

Five kinds: \`NOTE\` · \`TIP\` · \`IMPORTANT\` · \`WARNING\` · \`CAUTION\`. All of them are coloured **in exports too**.

## Math and diagrams

\`$E = mc^2$\` renders with KaTeX.

A \`mermaid\` fence becomes a diagram, styled from the application's own colour tokens — change your theme and the diagram follows. Mermaid loads **only when a document contains one**, so a document without diagrams costs nothing.

## Wiki links

\`[[Another note]]\` links to \`Another note.md\`, found by file name from any folder.

If two folders hold a file with that name, **no guess is made** — it is reported as broken. Sending you somewhere plausible and wrong is harder to notice than a link reported broken.

## Heading anchors

Every heading is given an id using GitHub's rules, so \`[](#a-section)\` works. Non-Latin headings are handled properly.

## Code blocks

Each block shows its **language** and a **copy button**. The copy takes the raw text, not what the highlighter drew.

**To change the language:** put the caret anywhere in the block and use \`Ctrl+Shift+P\` → "Set code block language". It works on a block you have not closed yet.

## Running code

For a language installed on this machine, a **Run button** appears on the block: JavaScript, Python, Ruby, PHP, Go, shell, PowerShell.

The output appears **under the block it came from**.

> [!CAUTION]
> **There is no sandbox and we do not claim one.** The code runs with your own permissions — exactly as it would if you had saved the block to a file and run it yourself. It can read your files and reach the network.
>
> That is why it **never runs on its own**: not on open, not on save, not in the preview. Only when you press the button, one block at a time.
>
> There is a 10-second limit; an endless loop is killed.

## Linter and clean-up

The statistics panel checks **nine rules** — a heading with no space after the hash, an unclosed fence, an image with no alt text, broken anchors, duplicate headings.

If anything is repairable, a **"Clean up" button** appears. It fixes only the **four with one correct answer**: a jammed heading, tabs, stray trailing spaces, an unclosed fence.

It leaves the other five alone — inventing alt text or picking a language would edit **meaning rather than form**.`
  },

  {
    id: 'files',
    title: 'Files and documents',
    markdown: `# Files and documents

## The file tree

Folders are read **when you expand them**, not up front. Opening a 50,000-file repository costs only the folders you open.

Right-click for create, rename, duplicate, delete, cut, copy. Drag and drop works, and so do \`Ctrl+C\` / \`Ctrl+V\` on files.

By default the tree shows **only files the editor can open**. One switch in Settings → Files turns everything else back on.

## Tabs

Reorderable, with a dot for unsaved changes. Reopen a closed tab with \`Ctrl+Shift+T\`.

## Workspace search

\`Ctrl+Shift+F\` — find and replace across the folder, with glob, regex, whole-word and case options.

## Version history

**Every save is kept.** See the diff and restore in one click. This is separate from crash recovery: recovery answers "what was I typing when the power went out", history answers "what did this look like on Tuesday".

## Trash

Deleted files are recoverable. The limit is configurable, or unlimited.

## Conflict protection

If the file changed on disk, a save **never silently overwrites it** — you are given the choice: save a copy, reload, or overwrite.

## Locking a document

\`Ctrl+Shift+P\` → "Lock or unlock this document".

Editing is turned off and the status bar shows **"Locked"**. Saving is blocked too, so autosave and "save all" respect it.

> [!NOTE]
> This is **not a security boundary**. It guards against the accidental keystroke in something finished, signed off, or someone else's. It does not change the file's permissions on disk — that is the operating system's job.

## Images

Adding a local image offers **cropping and compression** first:

- Drag on the image to choose a crop
- Turn compression on and set the quality
- Choose a maximum width (800 / 1200 / 1600 / 2400, or the original)

The resulting size is shown while you decide. Compression uses **WebP**, which keeps transparency — a screenshot with a rounded corner survives it.

## Drop anything

Drop a file on the editor: images are inserted, Markdown and text files are opened, anything else is linked relatively.`
  },

  {
    id: 'views',
    title: 'Presentation, website, links',
    markdown: `# Seeing the document differently

## Presentation mode

**\`F5\`** turns the document into a deck. A line containing only \`---\` is a slide break.

Which means: **a document written for reading already presents sensibly** — the breaks an author put between sections are exactly where the slides should change.

| Key | What it does |
|---|---|
| \`→\` \`Page Down\` \`Space\` | Next |
| \`←\` \`Page Up\` | Previous |
| \`Home\` / \`End\` | First / last |
| \`Escape\` | Leave |

Slides render through **the preview's own pipeline**, so a table or a diagram looks the same in both.

## Website preview

**\`Ctrl+Alt+W\`** shows the document at three device widths: **390** (phone), **768** (tablet), **1280** (laptop).

These are not round numbers — 390 is an iPhone 14. A made-up 400 would quietly miss the phone everyone has.

The frame is **a real element of that width**, not a scaled picture: the text wraps and the tables overflow exactly as they will for a reader. Scaling is applied afterwards only so a 1280px layout fits on screen.

## Links and graph

**\`Ctrl+Alt+L\`** scans the folder and draws:

- **A map** — documents as nodes, links as lines. A well-connected document is a bigger circle. Hovering a node lights only what it connects to; clicking opens that document.
- **Backlinks** — what links to the document you are reading
- **Broken links** — each with its file and line

The map **draws the same picture every time**: there is no random placement. A map that rearranges itself on every open is not a map.`
  },

  {
    id: 'book-study',
    title: 'Book and study',
    markdown: `# Book and study

## Book mode

Add a **\`SUMMARY.md\`** to the folder, listing chapters as a nested list of links:

\`\`\`md
# Summary

- [Introduction](intro.md)
- Part one
  - [First chapter](one/first.md)
  - [Second chapter](one/second.md)
- [Appendix](appendix.md)
\`\`\`

**\`Ctrl+Alt+K\`** reads the folder as one work.

- An entry with no link (**Part one**) is a part title, not somewhere to go
- Clicking a chapter opens it on its own
- A chapter that is not on disk is flagged with an amber triangle

**"Open as one document"** combines them, shifting each chapter's headings **to its depth**: a chapter that is \`# First chapter\` in its own file becomes \`## First chapter\` in the book. Otherwise a combined document has a dozen level-one headings and no structure at all.

This is not a ninth export format — **the combined text is an ordinary document**, so all eight existing formats already work on it.

> [!TIP]
> The \`SUMMARY.md\` format is the one mdBook and GitBook use. The table of contents is a normal document: written in this editor, reordered by dragging lines, readable on GitHub.

## Study mode

Cards live **in the document itself**. Two forms:

\`\`\`md
Ontology :: the study of being

What is a monad?
?
A monoid in the category of endofunctors.
\`\`\`

The first is one line — for vocabulary and quick facts. The second is a block — for anything that needs room.

The **study icon** in the sidebar opens a session:

1. The question is shown; the answer is hidden
2. **Space**, or "Show answer"
3. Four grades: **Again¹ · Hard² · Good³ · Easy⁴** (the number keys work too)

**"Again" sends the card to the end of this session** — not never, and not immediately. Forgetting a card and being shown it again a day later is how a deck rots.

The schedule is kept **in the application's data**, not in the document: a review schedule is personal, and writing "next due Thursday" into your notes would put churn into version control for a fact only your machine cares about.

A card is **identified by its own text**. Reorder the document, rewrite the prose around a card — it keeps its history.

> [!IMPORTANT]
> Study mode needs the document to be **saved** — the schedule is keyed to the file path.`
  },

  {
    id: 'export',
    title: 'Export and sharing',
    markdown: `# Export and sharing

\`Ctrl+Alt+E\` — **eight formats**:

| Format | For |
|---|---|
| **Markdown** | The document as it is |
| **Plain text** | The prose with the syntax stripped |
| **Rich text (.rtf)** | Anything that reads formatted text |
| **Word (.docx)** | Word, Pages, Google Docs |
| **HTML** | One self-contained page with styles and images embedded |
| **PDF** | Paginated |
| **PNG** | An image |
| **JSON** | Structured data |

Printing renders the document, **never the editor**.

## About Word and RTF

Both are generated from the **same reading of your document**, so they cannot disagree. Headings, lists, task boxes, quotes and code all carry over.

RTF handles non-Latin text correctly — RTF predates Unicode, so every character above ASCII has to be escaped by hand or the document arrives as mojibake.

## Paste as Markdown

Copy from a web page, then \`Ctrl+Shift+P\` → **"Paste as Markdown"**.

Headings, lists, tables and code survive; the page's **navigation, banner and footer** do not.

This does not hijack \`Ctrl+V\`. Copying rich text and getting Markdown *sometimes* — depending on what the source application put on the clipboard — would be unpredictable in the worst way.

## Sharing

Email a document: a draft opens in your mail client with the file attached. The recipient needs nothing installed.`
  },

  {
    id: 'tools',
    title: 'Tools and AI',
    markdown: `# Tools

## Developer tools

**\`Ctrl+Alt+T\`** — the things a writer of technical documents keeps a second browser tab open for:

JSON format/minify · JSON↔YAML · Base64 · URL escaping · JWT decoding · timestamp conversion · a regex tester · UUIDs

**All of it runs locally**, and that is the point: the text you paste in is usually a token, a config file or a customer's payload, and pasting those into someone else's site is a habit worth breaking.

A JWT's signature is **shown but not checked** — verifying it needs the secret, and displaying "valid" without one would be lying about the only thing the word means.

## HTTP request

For the API a technical document is about: method, address, headers, body; status, timing and a pretty-printed response.

Headers are typed one per line as \`Name: value\`. **Lines starting with \`#\` are ignored** — for switching an authorisation header off temporarily.

The guards:

- **Only \`http://\` and \`https://\`** — re-checked at every redirect
- **No cookies or credentials travel** — only the headers you typed
- A 30-second timeout, a 5 MB ceiling
- It fires **only when you press the button**

## The AI assistant

**Off by default.** Add a provider in Settings → AI: OpenRouter, OpenAI, Anthropic, Gemini, Groq, DeepSeek, Mistral, Together, xAI, Fireworks — or a local Ollama / LM Studio.

Five actions:

| Action | What it does |
|---|---|
| **Tidy up** | Grammar, punctuation, phrasing |
| **Add detail** | Develops existing points; invents no facts |
| **Summarise** | Shortens to the essentials |
| **Review** | **Does not rewrite** — reports findings |
| **Your own instruction** | Whatever you ask |

"Review" differs from the rest in kind: it returns a list — structural mismatches, missing sections, unexplained claims — not a document. That is why its result has **no "Replace" button**.

> [!NOTE]
> Keys are encrypted per operating-system account and **never touch \`settings.json\`**. Before sending, the application **shows you what it is about to send**.`
  },

  {
    id: 'customise',
    title: 'Making it yours',
    markdown: `# Making it yours

## Theme and colours

Settings → Appearance:

- **Light / Dark / System**
- **Seven accent colours**
- **Six palettes** — Nord, Solarized, Gruvbox, Rosé Pine, Sepia, high-contrast
- **Custom colours** — override any single token with the built-in picker

The colour picker is the application's own component, not the operating system's dialog.

## Icons

Give a file, a folder, or a whole file type its own icon and colour — from the built-in set or your own SVGs.

## Language

English, Azerbaijani, Russian. **A fourth is a JSON file you drop into the application's data folder** — no rebuild required.

## Shortcuts

Settings → Keyboard. **Every command's accelerator can be changed**, and conflicts are shown.

## Interface zoom

\`Ctrl +\` and \`Ctrl -\` scale the sidebar and settings **independently of the editor text**. The editor's own font size is a separate setting.

## Searchable settings

Type into Settings to find any preference across every page; choosing a result opens that page with the control highlighted.`
  },

  {
    id: 'shortcuts',
    title: 'Shortcuts',
    markdown: `# Shortcuts

The full list is in **Settings → Keyboard**, and every one can be changed. Everything is also reachable from the command palette.

## Essentials

| Action | Shortcut |
|---|---|
| Command palette | \`Ctrl+Shift+P\` |
| New / Open / Save | \`Ctrl+N\` / \`O\` / \`S\` |
| Save As | \`Ctrl+Shift+S\` |
| Open folder | \`Ctrl+Shift+O\` |
| Close tab / Reopen closed | \`Ctrl+W\` / \`Ctrl+Shift+T\` |
| Settings | \`Ctrl+,\` |

## Editing

| Action | Shortcut |
|---|---|
| Find / Replace | \`Ctrl+F\` / \`Ctrl+H\` |
| Search workspace | \`Ctrl+Shift+F\` |
| Go to line | \`Ctrl+G\` |
| Bold / Italic / Code | \`Ctrl+B\` / \`I\` / \`E\` |
| Insert link | \`Ctrl+K\` |
| Heading 1–6 / Paragraph | \`Ctrl+1…6\` / \`Ctrl+0\` |
| Emoji | \`Ctrl+Alt+M\` |
| New from template | \`Ctrl+Alt+N\` |

## Views

| Action | Shortcut |
|---|---|
| Cycle view mode | \`Ctrl+Shift+V\` |
| Reading mode | \`Ctrl+Shift+R\` |
| Outline | \`Ctrl+Shift+U\` |
| Presentation | \`F5\` |
| Website preview | \`Ctrl+Alt+W\` |
| Links and graph | \`Ctrl+Alt+L\` |
| Book | \`Ctrl+Alt+K\` |
| Developer tools | \`Ctrl+Alt+T\` |
| Toggle sidebar | \`Ctrl+Alt+B\` |
| Toggle theme | \`Ctrl+Shift+D\` |
| Print / Export | \`Ctrl+P\` / \`Ctrl+Alt+E\` |
| Interface bigger / smaller / reset | \`Ctrl+=\` / \`Ctrl+-\` / \`Ctrl+Alt+0\` |`
  }
]
