---
type: ADR
id: "0138"
title: "Local-first archival ingest (Reddit / Discord / forums / web)"
status: active
date: 2026-06-16
---

## Context

Grover should let users pull external knowledge — Reddit threads, Discord
channels, forum posts, web articles — into the vault and keep them **forever,
offline**. Live network is only acceptable for the fetch step; once captured the
content must be local, git-versioned, typed, wikilink-able, and queryable like
any other note. Constraint: **pure Rust, no bundled binaries** (Grover removed
the QMD binary in ADR 0009; we will not add kiwix-serve or whisper).

## Decision

**Ingest external content into typed "Source" notes stored in the vault, via a
three-layer pipeline:**

1. **Pure-TS transforms** (`src/lib/ingest/*`) turn fetched/exported data into a
   Source note (frontmatter + markdown body + a list of asset URLs). No network,
   no HTML→md for structured sources — fully unit-testable.
2. **Rust `ingest` backend** (Tauri commands) does the network/file work:
   `reqwest` outbound HTTP (avoids browser CORS, sets Reddit's required
   User-Agent), downloads assets into `_assets/<slug>/`, writes the note. HTML→md
   (Discourse/web) uses the Rust `htmd` crate; ZIM uses a pure-Rust reader.
3. **Frontend** Import surface: paste a URL (online) or pick an exported file
   (offline) → preview → create the note.

Every import is a first-class typed note: `type` (Reddit Thread / Discord
Channel / Forum Post / Web Clip), `source`, `url`, `author`, `captured_at`.

## Source-specific notes (from research)

- **Reddit**: append `.json` → `[postListing, commentsListing]`; comment `body`
  is already markdown; `replies` is `"" | Listing` (type-check before recursing);
  truncated trees use a `more` node (expand via `/api/morechildren`). Anonymous
  `.json` works server-side with a descriptive User-Agent; not CORS-friendly.
- **Discord**: no anonymous read API (bot token / OAuth only), so the local path
  is importing a **DiscordChatExporter JSON** (stable: `channel`, `messages[]`
  with `author`/`content`/`timestamp`/`attachments[]`) or the official data
  package (self-messages only — fallback).
- **Forums/web**: Discourse `/t/<slug>/<id>.json` (`post_stream.posts[].cooked`
  HTML); generic articles via readability. HTML→markdown in Rust (`htmd`).

## Options considered

- **A (chosen)**: archive to typed notes + local assets; TS transforms + Rust IO.
  Imports become first-class, offline, queryable. More upfront design.
- **B**: live read-only viewers (no archive). Simpler, but not offline and not
  part of the typed graph — fails the "store locally forever" requirement.
- **C**: bundle existing tools (kiwix-serve, a scraper binary). Fastest, but
  reintroduces the bundled-binary burden ADR 0009 removed.

## Consequences

- Imports are git-versioned, wikilink-able, and work with the query engine,
  graph, vault-health, and AI auto-type/rollup with zero extra wiring.
- Offline and online lanes are explicit: reading archived Sources is always
  offline; only the Import action touches the network, and it says so.
- Discord is file-import-first by necessity (no anonymous API).
- ZIM and media (PDF.js / `lopdf` / HTML5 players) extend the same Source model.
- Re-evaluation: if pure-Rust ZIM/readability prove inadequate, revisit a
  user-opt-in sidecar (like the AI CLI agents), never a bundled binary.
