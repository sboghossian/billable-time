# CONTINUE — billable-time (skill: `/draft-time-entries`)

> Pickup brief written 2026-05-17. Read this first when resuming.

## Status

**Discussion only. Nothing built yet.** This folder is empty. The spec below is what we converged on across two sessions on the MBP (2026-05-15 and 2026-05-16).

## The wedge

> "Auto-extract billable time from your Claude Code / VSCode session logs, group by matter, generate entries that import into Clio. Solos hate timesheets more than they hate AI."

Original framing was `/billable-from-claude`. **Renamed to `/draft-time-entries`** because the v1 idea is malpractice-shaped — the skill cannot _bill_, it can only _draft entries the lawyer reviews and signs off on_.

## Three constraints that gate v1

### 1. Ethics gate (non-negotiable)

Auto-converting Claude session time into attorney billable time is sanctionable in most US jurisdictions (and worse in CT, MA, NJ which have AI-disclosure opinions out). The skill **generates a reviewable diff of proposed entries**. Lawyer accepts / edits / rejects each one before anything hits Clio. Same audit-surface pattern as LexWiki and the `/lecun-world-model` stance: **no autonomous action on shared state** (client trust account = shared state).

### 2. Matter assignment is the actual hard problem (not CSV export)

Claude Code sessions aren't tagged by matter. Three viable signals, all leaky:

- **Working directory** (`~/Code/matters/smith-v-jones/` → matter ID). Requires the lawyer to already structure work this way. Most don't.
- **File-contents heuristic** (case captions, names). PII-risky, accuracy-shaky.
- **Manual chip per session.** Kills the "auto" pitch.

**v1 decision: directory convention + a `matter.yml` per project.** Skill reads it. Opt-in, deterministic, no inference. If `matter.yml` is missing, skill prompts the lawyer to attach a matter manually.

### 3. What counts as "billable" inside a session

- Prompting time = billable.
- Waiting for Claude = grey.
- Re-reading output = billable as review.
- Going down a wrong path = arguably not billable to client.

Raw timestamps don't carry this signal — only the lawyer does. So the skill **drafts** a duration with a narrative, but the lawyer adjusts. Never auto-bills.

## v1 SKILL.md spec (target)

Inputs:

- Path to Claude Code session JSONL (default: `~/.claude/projects/<cwd-slug>/*.jsonl`).
- Path to project root (where `matter.yml` lives).
- Time range (default: yesterday, since most lawyers bill the day after).

Reads:

- Session prompts + edits + file paths touched.
- `matter.yml` for matter ID, client, jurisdiction, billing rate, AI-disclosure-required flag.

Emits (as a markdown diff, NOT a write):

- One row per proposed time entry:
  - Matter ID, start, end, duration (rounded to 0.1h per Clio convention).
  - Narrative draft (synthesized from session prompts + edits — neutral lawyer-voice).
  - AI-disclosure flag per entry (auto-set if `matter.yml.ai_disclosure_required: true`).
- A summary of what was _excluded_ and why (long idle gaps, off-matter sessions, "exploration that didn't ship" candidates).

Lawyer accepts / edits / rejects each row. Only accepted rows hit Clio (via API, not CSV — round-trip is one click instead of "download → upload → reconcile").

## Why this matters beyond solos

The same audit surface is the **defense artifact** when a bar grievance asks "show me how you billed AI-assisted work." Nobody has that primitive yet. **That's the wedge — not the timesheet.**

## Distribution path

- Public skill on `github.com/sboghossian/<repo>` (AGPL-3.0 candidate per [[project_lawvable_submit_skill]] default).
- Submission to Lawvable (legal-skills registry) — use `/lawvable-submit` for the upload checklist.
- HAQQ Legal AI use-case: this is the kind of skill that demonstrates HAQQ's "audit surface" thesis to lawyers, distinct from the product itself.
- LinkedIn post in Stephane's voice — frame as "the audit primitive nobody is building."

## Immediate next step

Pick one:

- **A.** Run `/grill-me` on the spec to lock down the remaining unknowns: matter-tagging fallback when `matter.yml` is missing, narrative-generation prompt, local-only vs Claude API for narrative drafting, Clio API auth, jurisdiction-specific disclosure rules. Output: a tight `SKILL.md` ready to build.
- **B.** Skip the grill, build the **happy-path prototype**: hardcoded `matter.yml`, dry-run on Stephane's actual Claude Code session logs (this Mac has 200+ sessions, perfect dataset), emit a markdown diff. Get to "I can see entries on screen" before any Clio integration.
- **C.** Park the skill until [[project_ambiguity_index]] v1 ships — same audit-surface family, no point dividing attention.

Recommendation: **B.** Build the happy path. The grill questions resolve faster against a running prototype than in the abstract. Then `/grill-me` against the prototype output to find what breaks.

## Sources

- MBP session 2026-05-15: original framing + my pushback ([[2026-05-15-i-like-this-billable-from-claude-auto-extract-billable-time]]).
- MBP session 2026-05-16: user picked "mix of A+B+C+D" answers but original questions weren't in context, so spec didn't advance ([[2026-05-16-regarding-billable-time-project-1-mix-of-abcd]]).

## Related memory

- `project_lawvable_submit_skill.md` — distribution checklist
- `project_haqq_lecun_world_model.md` — audit-surface principle
- `project_lexwiki_anylegal.md` — audit-surface UX as competitive moat
- `project_oral_argument_skill.md` — sibling lawyer-skill in the same registry
- `feedback_default_workdir.md`
