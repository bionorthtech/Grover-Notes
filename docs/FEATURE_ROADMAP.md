# Grover Feature Roadmap — Obsidian Parity & Beyond

This roadmap tracks the 25 Obsidian-ecosystem capabilities Grover aims to provide on
top of the inherited Tolaria base. It is a **planning document** — items are not yet
implemented unless explicitly marked. Each entry notes the closest Obsidian plugin
analogue and whether existing parts of Grover's stack can be reused.

## Reuse opportunities already in the codebase

The Tolaria base ships several libraries that shortcut multiple features below:

- **BlockNote + CodeMirror** — rich-text/markdown editor → editor-level features (toolbar, outline, tables, typewriter scroll, regex replace).
- **Mermaid** (`src/components/MermaidDiagram.tsx`) — diagram rendering → mind maps, charts.
- **TLDraw** (`src/components/GroverWhiteboard.tsx`) — vector canvas → embedded sketching/whiteboards.
- **Git-first vaults** — every vault is already a git repo → local version control surface.
- **Type system + properties + YAML frontmatter** → backing model for querying, kanban, flashcards.
- **shadcn/ui + CSS variable theme** (`src/index.css`) → styling panel, UI hiding, custom icons.

---

## Phase A — Editor & low-lift (build on existing editor)

| # | Feature | Obsidian analogue | Notes / reuse |
|---|---------|-------------------|---------------|
| 1 | Natural-language date parsing | Natural Language Dates | Parse "next Friday" → date link on input; reuse editor input handlers. |
| 2 | Visual table formatting / sort | Advanced Tables | Keyboard nav + sort over markdown tables in the editor. |
| 3 | Word-processor formatting toolbar | Editing Toolbar | Floating toolbar applying BlockNote marks; reuse shadcn buttons. |
| 4 | Typewriter scroll centering | Typewriter Scroll | Keep active line centered; CodeMirror/scroll listener. |
| 5 | Roam-style outline management | Outliner | Indent/collapse/move nested bullets via keybindings. |
| 6 | RegEx global text replacement | Regex Find/Replace | Vault-wide regex rules; reuse search infra. |
| 7 | Bulk highlights extraction | Extract Highlights | Pull all `==highlights==` to clipboard from a note. |
| 8 | UI component hiding | Hider | Toggles to hide status bar, ribbons, title bar; CSS vars. |
| 9 | CSS-variable styling panel | Style Settings | UI panel exposing `--*` tokens in `src/index.css`. |
| 10 | Custom file/folder icons | Iconize | Per-path icon assignment in the file explorer. |

## Phase B — Data & automation

| # | Feature | Obsidian analogue | Notes / reuse |
|---|---------|-------------------|---------------|
| 11 | Dynamic vault querying | Dataview | Query frontmatter/tags into tables/lists; uses type+properties model. |
| 12 | Advanced template automation | Templater | Templates with variables, dates, prompt scripts. |
| 13 | Local git version control UI | Obsidian Git | Surface existing per-vault git: history, auto-commit, restore. |
| 14 | Interactive charting | Charts | Render bar/line/pie from code-block data arrays. |
| 15 | Spaced-repetition flashcards | Spaced Repetition | Convert Q/A blocks into a review queue. |

## Phase C — Visual / layout (reuse TLDraw & Mermaid)

| # | Feature | Obsidian analogue | Notes / reuse |
|---|---------|-------------------|---------------|
| 16 | Markdown kanban boards | Kanban | Boards backed by markdown; cards = list items/notes. |
| 17 | Embedded sketching | Excalidraw | Reuse existing TLDraw whiteboard component. |
| 18 | Dynamic mind maps | Mind Map | Render outline/headings as a map; reuse Mermaid or markmap. |
| 19 | Sidebar calendar widget | Calendar | Monthly calendar → open/create daily notes. |
| 20 | Code-based music notation | Music Notation | Render ABC/VexFlow from code blocks. |

## Phase D — Heavy / external integrations

| # | Feature | Obsidian analogue | Notes / reuse |
|---|---------|-------------------|---------------|
| 21 | Multi-cloud vault syncing | Remotely Save | Dropbox/OneDrive/WebDAV/S3 backends (Tauri/Rust side). |
| 22 | Interactive geographic maps | Leaflet | Embed Leaflet maps with pins/coordinates in notes. |
| 23 | PDF/image OCR search | Text Extractor | Tesseract OCR; index extracted text into search. |
| 24 | One-click third-party migrations | Importer | Notion/Evernote/Apple Notes/Google Keep → markdown. |
| 25 | External task interactivity | Todoist Sync | Bidirectional Todoist sync embedded in notes. |

---

## Shipped beyond the roadmap

- **Archival ingest (Source notes)** — import Reddit threads, Discord channels,
  forum topics, and web articles as typed notes that read back fully offline.
  Documented in [`INGEST.md`](./INGEST.md) and
  [`adr/0138-local-archival-ingest.md`](./adr/0138-local-archival-ingest.md).
  Related future items from the table above: 23 (PDF/image OCR) and a ZIM/Kiwix
  reader remain unbuilt.

---

## Sequencing notes

- Phases are ordered by effort and dependency. Phase A items are mostly self-contained
  editor enhancements; Phase D items require new Rust-side integrations, credentials,
  and network policy work.
- Each feature should ship with tests and (per the inherited contributor workflow) keep
  the existing quality gates green where the tooling is available.
- Items 13, 17, 18 are partial wins because the underlying libraries already exist.

## Outstanding rebrand follow-ups (not features)

- **App/brand icon art:** the binary icons under `src-tauri/icons/` and `src/assets/`
  still contain Tolaria's original artwork. Per Tolaria's trademark policy these must be
  replaced with original Grover artwork before any public release.
- **Updater endpoint** currently points at `bionorthtech.github.io/grover-notes`, which
  does not host releases yet; wire up or disable before shipping auto-update.
