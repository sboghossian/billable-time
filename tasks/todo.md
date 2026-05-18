# billable-time — todo

## v1 prototype (happy path) — DONE

- [x] Scaffold project (tasks, matter example, README)
- [x] `draft-entries.mjs` — Node CLI
  - [x] Parse JSONL session log (user + assistant + tool_use events)
  - [x] Cluster events into "active intervals" (gap > 5 min closes an interval)
  - [x] Group by matter via `matter.yml` (cwd-prefix match)
  - [x] Compute duration (rounded to 0.1h Clio convention)
  - [x] Synthesize neutral narrative from prompts + tools used
  - [x] Flag AI-disclosure per entry
  - [x] Markdown diff output (accept/edit/reject rows)
  - [x] Excluded-summary block (long idle gaps, off-matter, trivial)
- [x] Dry-run on real session logs → `out/sample-draft.md`
- [x] README with usage + ethics note

## Artifact-credibility fixes (done 2026-05-18)

The 2026-05-17 dry-run exposed two issues a lawyer would catch immediately:

- [x] **Strip verbatim prompt text from narrative by default** — `--include-prompt-snippet`
      added as opt-in. Default narrative is tool-shape only.
- [x] **Broad-route warning banner** — `checkRoutes()` flags routes that equal
      `$HOME` or `/`. Warning appears under the title in the generated artifact.
      The metadata line also exposes the prompt-snippet setting so reviewers see
      the verbosity level.
- [x] Regenerate `out/sample-draft.md` with the fixes.

## Distribution

- [x] `git init` + push to `github.com/sboghossian/billable-time` (AGPL-3.0)
- [x] Self-contained `web/index.html` browser port (no backend, no deps)
- [x] Paste-ready Lovable brief at `web/LOVABLE_PROMPT.md`
- [ ] Scaffold the Lovable project `732d1712` from the brief (Stephane runs)
- [ ] `/lawvable-submit` once the Lovable URL is live
- [ ] LinkedIn post — frame as the audit primitive nobody is building

## Out of scope for v1

- Clio API integration (markdown diff only)
- File-contents PII heuristic for matter routing
- Multi-jurisdiction disclosure rules table
- LLM-based narrative drafting (use deterministic template; let lawyer edit)

## Open questions (resolve against the running prototype, not in the abstract)

- Idle gap threshold: 5 min, 10 min, configurable? — **currently `--idle-gap-min`, default 5. Probably right.**
- Narrative voice: "Drafted X / reviewed Y" vs "Researched / analyzed"? — **currently tool-shape verbs. Lock in.**
- Round to 0.1h up, nearest, or down? — **currently nearest. Clio convention is nearest_tenth.**
- Should "exploration that didn't ship" be excluded by default or flagged for lawyer review? — **deferred; needs git-touch signal that v1 doesn't have.**
