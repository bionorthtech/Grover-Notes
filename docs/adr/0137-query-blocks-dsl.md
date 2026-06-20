---
type: ADR
id: "0137"
title: "Query blocks: a small DSL for live note tables/lists"
status: active
date: 2026-06-16
---

## Context

Grover's value comes from typed notes with frontmatter properties and
relationships, but there was no way to *query* that structure — e.g. "active
Projects I own, newest first". Obsidian users reach for the Dataview community
plugin (its own large query engine + DSL). We want the same power as a
first-class, dependency-free capability that runs against the already-loaded
`VaultEntry[]` (no indexing, instant, offline).

## Decision

**Introduce a tiny line-based query DSL (`grover-query`) with a pure parser and
evaluator in `src/lib/queryBlocks.ts`.** Clauses: `from` (type), `where`
(and-joined conditions; ops `= != > < >= <= contains`; relative dates
`today/yesterday/now` on date fields), `sort`, `group`, `limit`, `as`
(`table|list`), `fields`. `fieldValue()` resolves built-ins (title, type, status,
modified, created, words, path) and dynamic frontmatter properties /
relationships. `evaluateQuery()` filters (excluding Type defs + archived), sorts,
limits; `groupResults()` groups by a field.

Rendering is separate (`QueryBlockView`), and the engine is surfaced today via a
live **Query runner** dialog. Inline rendering inside the note editor (a
ProseMirror node view) is deferred.

## Options considered

- **Option A** (chosen): Custom minimal DSL, pure TS, evaluated over in-memory
  entries. Zero deps, fully unit-testable, instant. Downside: not as expressive
  as Dataview (no JS expressions, joins).
- **Option B**: Adopt/port Dataview's engine. Familiar syntax, powerful.
  Downside: large surface, JS-eval security concerns, heavy to maintain.
- **Option C**: SQL-like engine over a generated index. Powerful. Downside:
  indexing step + far more complexity than the data volume warrants.

## Consequences

- A new core abstraction: queries are pure functions of `VaultEntry[]`, so they
  re-run cheaply on every vault change and need no persistence or indexing.
- The DSL is intentionally small; new clauses/operators extend `applyClause` and
  `matches` with matching unit tests.
- Surfaced via the Query runner now; the same `QueryBlockView` can later render an
  inline ```grover-query fenced block once an editor node view exists.
- The vault-health, vault-stats, and related-notes features reuse the same
  field-resolution philosophy (read what's already on entries).
- Re-evaluation trigger: if users need joins, computed columns, or JS
  expressions, revisit Option B.
