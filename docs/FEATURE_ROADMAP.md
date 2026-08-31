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
| 2 | ~~Visual table formatting / sort~~ **Shipped** | Advanced Tables | Done: `src/lib/markdownTable*.ts` + `src/extensions/markdownTableKeymap.ts`. Tab/Shift-Tab cell nav, Mod-Shift-F format, 12 palette commands (insert/delete row+column, sort, align). Display-width aware so CJK tables align. |
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

## Prioritization evidence

> **Prioritization note (2026-08).** Obsidian community-plugin install counts
> (`community-plugin-stats.json`, 7,085 plugins) put **editor ergonomics at
> 12.5%** of plugin demand — second only to drawing, and about the same size as
> the entire power-user block (querying + templating + tasks) that Grover has
> already built. That is why Phase A ergonomics items are being pulled ahead of
> Phase B/C. The same data shows **spaced repetition at 0.8%** despite its
> cultural prominence, so item 15 is deliberately deprioritized; music notation
> (20) and geographic maps (22) do not appear in the top 45 plugins at all.

---

## Shipped beyond the roadmap

- **Archival ingest (Source notes)** — import Reddit threads, forum topics, and
  web articles as typed notes that read back fully offline.
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

- ~~**App/brand icon art:**~~ **Done.** All icons are now original Grover artwork (a
  cream sprout on a forest-green squircle) generated from
  `src-tauri/icons/grover-icon-source.svg`; the favicon and in-app/site logos use the
  same mark. No Tolaria artwork remains, satisfying the trademark requirement.
- **Legacy `tolaria` identifiers are intentional.** `LEGACY_APP_STORAGE_KEYS`
  (`src/constants/appStorage.ts`) and `LEGACY_MCP_SERVER_NAME` (`src-tauri/src/mcp.rs`)
  deliberately retain the old name so users upgrading from Tolaria keep their settings
  and get their stale MCP entry migrated. Do not "clean these up" in a rename pass —
  a blanket rename previously collapsed the MCP pair into one value and silently
  disabled that migration.
- **Updater endpoint — no code change needed, just a release step.** The config points
  at `bionorthtech.github.io/grover-notes/stable/latest.json`, which currently 404s only
  because GitHub Pages has never been deployed for this repo (no release has been cut).
  The plumbing is already correct: `.github/workflows/deploy-docs.yml` builds
  `stable/latest.json` from the release assets and publishes it to Pages. Verified that a
  failing check degrades gracefully — `useUpdater` catches it, and `UpdateBanner`
  explicitly excludes the `error` state, so users see nothing rather than a broken
  banner. It starts working once the first release publishes and Pages deploys; no need
  to disable the updater.
