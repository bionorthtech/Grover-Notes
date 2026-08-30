---
type: ADR
id: "0139"
title: "Drop Discord from archival ingest"
status: active
date: 2026-08-30
supersedes: "0138"
---

## Context

[ADR 0138](./0138-local-archival-ingest.md) established local-first archival
ingest and included Discord alongside Reddit, Discourse forums, and web clips.

Discord was always the odd one out. Every other source exposes public content
anonymously — append `.json` to a Reddit thread or a Discourse topic URL and the
content comes back with no credentials. Discord has **no anonymous read API at
all**; every read is authenticated. ADR 0138 worked around this by supporting
import of a [DiscordChatExporter](https://github.com/Tyrrrz/DiscordChatExporter)
JSON file, which meant Discord alone required the user to install and run a
separate third-party tool before Grover could do anything.

That produced a lopsided feature:

- **Inconsistent UX.** Every other source is "paste a link, press Fetch."
  Discord was "go install another program, export a channel, come back, paste
  the file." The Import dialog had to explain a workflow that applied to exactly
  one source.
- **Unused surface area.** The transform, its detection heuristic (any JSON
  object with a `messages[]` array), its tests, and its share of the docs all
  existed to serve a path most users would never complete.
- **A detection footgun.** `messages[]` is a generic shape. Any unrelated JSON
  with that key was silently claimed as a Discord export.
- **No credible upgrade path.** Making Discord work like the others needs a bot
  token (requires *Manage Server*) or OAuth (whose scopes do not cleanly cover
  message history). The remaining option — a personal user token — is a
  "self-bot" that **violates Discord's Terms of Service** and gets accounts
  banned. We will not ship that.

## Decision

**Remove Discord from ingest.** Supported sources are now Reddit threads,
Discourse forum topics, and web clips — all anonymously readable, all reachable
by pasting a URL.

The scope rule going forward: **ingest covers sources that expose public,
unauthenticated content.** Anything needing a login or API token is out of scope
because it would require credential storage and an auth flow, which is a
separate product decision with its own security surface.

Removed: `src/lib/ingest/discord.ts` and its tests, the `'discord'`
`SourceKind` and its `Discord Channel` type label, the `messages[]` detection
branch, and the Discord copy in the Import dialog, command palette, and docs.

## Consequences

- The Import dialog now describes one consistent workflow, and the detection
  heuristic no longer claims arbitrary `messages[]` JSON.
- `SourceKind` is `'reddit' | 'discourse' | 'web'`. This is a breaking change to
  the type, but no notes are affected: `source:` in frontmatter is free-form
  text, so any previously imported Discord note still opens and renders as a
  normal Markdown note. It simply no longer maps to a built-in type label.
- Everything else in ADR 0138 stands unchanged: the `SourceNote` model,
  provenance frontmatter, `Sources/` storage, offline asset download, and the
  pure-TS-transform / Rust-IO split.
- If Discord is ever wanted again, the bot-token route is the only acceptable
  one, and it should be its own ADR covering token storage and rate limiting.
