# billable-time

Draft reviewable time entries from Claude Code session logs. Lawyer accepts / edits / rejects every row before anything hits a billing system. **The tool never bills.**

## Why

Auto-converting AI-assisted work into attorney billable time is malpractice-shaped. CT, MA, and NJ already have AI-disclosure opinions. The wedge isn't the timesheet — it's the **audit-surface artifact** a lawyer signs off on, and that survives a bar grievance asking "show me how you billed AI-assisted work."

Same audit-surface stance as LexWiki and the broader "no autonomous LLM action on shared state" principle.

## v1 (this prototype)

- **In:** Claude Code session JSONL files + a `matter.yml` describing the matter.
- **Out:** a markdown diff with proposed entries (start, end, rounded duration, narrative draft, AI-disclosure flag) and an **Excluded** section explaining what wasn't billed and why.

No Clio API yet. No LLM in the loop (deterministic narrative template — the lawyer rewrites). Just enough to see what the artifact looks like against real session data.

## Usage

```bash
node draft-entries.mjs \
  --session ~/.claude/projects/-Users-yourcwd-slug/ \
  --matter ./examples/matter.yml \
  --since 2026-05-15 \
  --until 2026-05-17 \
  --out out/draft.md
```

Flags:

- `--session` — JSONL file **or** directory of JSONL files.
- `--matter` — path to a `matter.yml`. See `examples/matter.yml`.
- `--since`, `--until` — inclusive `YYYY-MM-DD` window. Default = last 24h.
- `--idle-gap-min` — minutes of inactivity that close an interval (default 5).
- `--out` — output markdown path (default `out/draft.md`).
- `--include-prompt-snippet` — opt-in. Include a short prompt headline in each
  entry's narrative. **OFF by default** because Claude Code session history is
  typically shared across many matters and side projects; verbatim prompt text
  from an unrelated session would leak into a matter's billing artifact. Only
  enable this on a machine where you trust every session in the window to
  belong to the same matter.

## Routing safety

If `matter.yml.routes[]` matches your home directory or `/`, the generated
artifact will carry a prominent warning banner at the top. This is the case
that turns the tool from "audit surface" into "malpractice generator" — the
warning is non-removable so a lawyer can't ship a draft they didn't notice
came from an over-broad route.

## Matter routing

Matter assignment is the actual hard problem — Claude session logs aren't tagged. v1 uses **directory convention only**:

- The CLI uses `matter.yml.routes[]` as cwd prefixes.
- Any event whose `cwd` matches a route is on-matter.
- Everything else is reported in the **Excluded** section, grouped by cwd, so the lawyer can decide whether to add that path to `routes[]` and re-run.

No file-contents heuristics. No filename inference. Opt-in, deterministic, no PII risk.

## Three constraints that gate v1 (from CONTINUE.md)

1. **Ethics gate.** Reviewable diff only. Lawyer is the gate.
2. **Matter assignment.** Directory convention + `matter.yml`. If your work isn't organized that way, the tool says so and asks you to attach a matter manually — it does not guess.
3. **What counts as billable.** Raw timestamps don't carry that signal. The tool drafts duration + narrative; the lawyer adjusts. Long idle gaps and "exploration that didn't ship" are excluded by default and surfaced for review.

## Dry-run output

A real-data dry-run lives at `out/sample-draft.md` (this Mac mini's actual session logs, narrative defaults — tool-shape verbs only, no prompt snippets). The `test-matter.yml` used to generate it routes the entire home directory on purpose, to show **what the routing-warning banner looks like in the artifact when a route is too broad**. Read it to see the artifact shape — including the warning surface — before touching code.

## Web version

See `https://lovable.dev/projects/732d1712-27ea-4db5-ab1e-9aa8030a7cce` for the same workflow as a drag-and-drop web tool (upload JSONL + `matter.yml`, see the diff, accept/edit/reject in browser). Backend-free; the JSONL never leaves the browser.

## Status

Prototype. Pre-publish. v1 spec in [`CONTINUE.md`](./CONTINUE.md). Open questions tracked in [`tasks/todo.md`](./tasks/todo.md).

## License

AGPL-3.0 candidate (per the public-skill default). Not yet committed to a repo.
