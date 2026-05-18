# Lovable prompt — billable-time web

This is the brief to paste into the Lovable.dev project
`https://lovable.dev/projects/732d1712-27ea-4db5-ab1e-9aa8030a7cce` to scaffold
the polished web version. The bare-metal HTML version already works at
[`web/index.html`](./index.html) — Lovable is the upgrade path for solo
practitioners who want a real product UI, not just a single-file tool.

---

## Paste this into Lovable

> Build a single-page web app called **billable-time**. It helps solo and
> small-firm lawyers turn their Claude Code session logs into reviewable draft
> time entries. The tool **drafts** — it never bills. The lawyer accepts,
> edits, or rejects each row before anything reaches a billing system. There
> is no backend; all parsing happens in the browser. Session data must never
> leave the user's machine.
>
> ### Pages / states
>
> 1. **Onboarding** (first visit) — explain the workflow in three steps with
>    illustrations:
>    1. Drop your Claude Code `.jsonl` files (we'll show how to find them).
>    2. Drop or paste your `matter.yml` (we'll show an example).
>    3. Review the draft and accept / edit / reject each row.
>       Below the steps, a green strapline: **"Your session files never leave
>       this page. No backend, no upload, no cloud."**
> 2. **Upload** — two large drag-and-drop zones side by side:
>    - **Session logs** (multi-file `.jsonl`)
>    - **Matter** (single `.yml` file _or_ a paste box with a worked example)
>      Below the zones: a "Find my session files" helper that detects the OS
>      and shows the exact path (`~/.claude/projects/...` on macOS/Linux,
>      `%USERPROFILE%\.claude\projects\...` on Windows).
> 3. **Options** (collapsible panel; sensible defaults pre-filled):
>    - Window: since / until (default = yesterday in user's local timezone)
>    - Idle-gap (minutes): default 5
>    - **Include prompt snippet in narratives**: off by default. Help text:
>      "Claude history is often shared across matters and side projects.
>      Verbatim prompt text from an unrelated session can leak into this
>      matter's billing artifact. Only enable on a single-matter machine."
> 4. **Draft view** — the generated entries as an interactive table, not a
>    static markdown block. Columns: timestamp range · duration · billable
>    hours (rounded to 0.1h, editable) · narrative (editable inline) ·
>    status chip (Accept / Edit / Reject — radio, default Edit).
>    A sticky header at the top shows: total proposed hours, total accepted
>    hours, total rejected hours, matter ID + client + jurisdiction + rate.
>    A persistent **warning banner** at the top of this view (red border,
>    amber background) appears whenever `matter.yml.routes` is too broad
>    (matches the user's home directory, root, or any 1-2-segment path).
>    Wording: "Route X matches your entire home directory. Every Claude Code
>    session in this window will be treated as on-matter — including work
>    for other clients or non-billable side projects. Narrow `routes` before
>    relying on this output."
> 5. **Excluded section** below the table — collapsible, shows the rows we
>    _didn't_ propose and why (off-matter cwd, idle gap, trivial duration).
>    Each row has an "Add to matter" button that drops the cwd into a
>    suggested `routes:` list the user can copy back into their `matter.yml`.
> 6. **Export** — three buttons:
>    - Download as `.md` (the audit artifact)
>    - Download as `.csv` (Clio import format: matter ID, date, duration, narrative, AI disclosure flag)
>    - Copy to clipboard (markdown)
>
> ### Visual style
>
> - **Serious, lawyerly, calm.** Not playful. No emoji except the warning
>   triangle ⚠️ on the route-too-broad banner.
> - Typography: a workhorse sans (Inter, IBM Plex Sans, or system stack).
> - Color: neutral grays, one accent (deep indigo or oxblood — pick one and
>   commit). Warning state uses amber/orange. Success/safety strap uses a
>   muted green.
> - Page width: 880px max, generous whitespace. No marketing flourishes.
>
> ### Logic (port this exactly — it's the audit-surface contract)
>
> The reference implementation is at
> `https://github.com/sboghossian/billable-time/blob/main/web/index.html`
> (the `<script type="module">` block — pure functions, no framework).
> Reuse it verbatim:
>
> - `parseYaml(text)` — minimal YAML parser tuned for `matter.yml` shape.
> - `extractEvents(jsonlTexts)` — pulls user + assistant events with timestamps.
> - `cwdMatchesMatter(cwd, routes)` — prefix match.
> - `checkRoutes(routes)` — flags routes that are `/` or ≤ 2 path segments.
> - `clusterIntervals(events, idleGapMs)` — gap-based session grouping.
> - `synthesizeNarrative(interval, { includePromptSnippet })` — deterministic
>   tool-shape verbs (drafted / reviewed / researched / ran analysis). The
>   prompt snippet is opt-in only.
> - `generate({ jsonlTexts, matterText, options })` — returns markdown +
>   structured intervals for the editable table.
>
> **Do not add an LLM call to rewrite narratives.** The deterministic
> template is intentional — the lawyer rewrites. Adding AI generation here
> reintroduces the malpractice surface the tool was designed to avoid.
>
> ### Ship constraints
>
> - No backend. No database. No analytics. No tracking pixel. No cookies.
> - No outbound network calls except optional static-CDN assets for fonts.
> - All processing in the main thread is fine for now (Claude session files
>   are small — a year of dense usage is < 200 MB).
> - Provide a "no data leaves this page" confirmation that the user can
>   click and that displays the (empty) network log.
>
> ### Out of scope for v1
>
> - Clio API integration (export CSV; the lawyer uploads to Clio themselves)
> - LLM-generated narratives (deterministic only)
> - Multi-matter mode (one `matter.yml` per run)
> - File-content heuristics for matter assignment (cwd prefix only)

---

## Notes for Stephane

- The reference `web/index.html` works standalone — keep it in the repo
  regardless of what Lovable produces. If Lovable goes down or pivots, the
  bare HTML is the fallback.
- After Lovable scaffolds, copy the deterministic logic back from
  `web/index.html` if Lovable rewrites it with an LLM-narrative shortcut.
- The audit-surface wedge depends on **never auto-billing** and **never
  inferring matter assignment from content**. Both are non-negotiable. If a
  Lovable iteration drifts on either, revert.
- Once a Lovable preview URL is live, add it to the repo `README.md` Web
  version section (currently a placeholder pointing at the project URL).
