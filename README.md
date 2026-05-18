# billable-time

> **The audit primitive nobody is building.** Draft reviewable, cryptographically-stamped time entries from Claude Code session logs. Lawyer accepts / edits / rejects every row before anything reaches a billing system. **The tool never bills.**

---

## The threat this is built against

If you bill a client for AI-assisted work, you need to be able to prove — to your client, to opposing counsel, and to your bar — exactly **how** AI was used and that you reviewed every line. The opinions are out and stacking up:

- **ABA Formal Opinion 512** (July 2024) — competence, confidentiality, supervision, candor, **fees**.
- **Florida Bar Op. 24-1** (Jan 2024) — first state opinion dedicated to GAI. Binding on Florida lawyers.
- **California State Bar Practical Guidance** (Nov 2023) — closest thing to a CA position pending rulemaking.
- **NYSBA AI Task Force Report + NYCBA Op. 2024-5** (Apr 2024).
- **DC Bar Op. 388** (Apr 2024).
- More coming, monthly.

Every one of them says some version of: bill actual time, disclose AI use, supervise the output, and don't share client confidences with a vendor that has no safeguards. **Nobody has built the primitive that lets a lawyer prove they did all four when the bill is questioned a year later.** This is that primitive.

## What you get

For every billing window you point this at, the tool produces two artifacts:

1. **`draft.md`** — the markdown record of proposed time entries. Every row is `accept` / `edit` / `reject` — the lawyer is the gate.
2. **`draft.audit.html`** — a self-contained, print-ready audit packet with the matter and attorney identity stamped, the AI-disclosure language stamped, a **SHA-256 chain of evidence** for every source file and the artifact itself, and a hand-signature block at the end. Open in any browser, print to PDF, sign, attach to the bill.

Both artifacts are reproducible from the same inputs. Both carry the artifact's own SHA-256 so post-generation tampering is detectable.

## The non-negotiable contract

1. **Never auto-bill.** The output is a draft. The lawyer is the only thing that turns a draft into a billed entry. The web version's "Generate" button does not have a "Send to Clio" twin and won't.
2. **Never infer matter assignment from file contents.** Only `matter.yml.routes[]` (cwd-prefix matching). The tool will not read a `.docx` and guess "this looks like an Acme matter." That's the malpractice surface this tool was designed to avoid.
3. **Never rewrite narratives with an LLM.** Verbs are deterministic and content-aware — derived from filenames, directory shape, and tool names. The artifact is reproducible byte-for-byte from the same inputs. Adding an LLM rewrite breaks the audit chain.
4. **Verbatim prompt text is OFF by default.** Claude history is typically shared across matters and side projects. Use `--include-prompt-snippet` only on a single-matter machine where you have confirmed every session in the window belongs to the same matter.
5. **A `verified: false` disclosure pack cannot ship a `--strict` artifact.** The pack is starter language; the lawyer's bar admission is what makes it canonical. Flip `verified: true` (with your bar ID in `verified_by`) only after reading the source opinion yourself.

## CLI

```bash
node draft-entries.mjs \
  --session ~/.claude/projects/<cwd-slug>/ \
  --matter ./examples/matter.yml \
  --since 2026-05-15 \
  --until 2026-05-17 \
  --out out/draft.md
```

Required flags: `--session`, `--matter`. Run `--help` for the full list.

Two operating modes:

- **Default (iteration)** — generates with warnings. You read the draft, fix `matter.yml`, re-run.
- **`--strict` (audit-final)** — refuses to generate if any audit invariant fails. Use this on the run you're about to sign.

`--strict` refuses on:

- Broad routes (`$HOME`, `/`, or 1–2 path segments)
- AI disclosure required but no usable `disclosure_text` (matter override or pack canonical)
- `disclosure_pack` referenced is invalid
- `disclosure_pack` is the active source AND marked `verified: false`
- `matter.attorney.name` / `bar_id` / `bar_jurisdiction` missing

## `matter.yml` schema

```yaml
matter:
  id: "2026-0427" # billing-system ID
  client: "Acme Holdings Ltd"
  caption: "Acme v. Smith"
  jurisdiction: "FL"
  practice_area: "litigation"

attorney: # required in --strict
  name: "Jane Doe"
  bar_id: "FL-1234567"
  bar_jurisdiction: "FL"

billing:
  rate_per_hour: 450
  rounding: "nearest_tenth"
  minimum_increment_hours: 0.1

ethics:
  ai_disclosure_required: true
  disclosure_pack: "fl-24-1" # loads disclosures/fl-24-1.yml
  # disclosure_text: ~              # optional lawyer override

routes:
  - "~/Documents/Matters/acme-v-smith"
```

See [`examples/matter.yml`](./examples/matter.yml) and [`examples/test-matter-strict.yml`](./examples/test-matter-strict.yml).

## Bar-opinion disclosure pack

[`disclosures/`](./disclosures) ships starter language keyed to known bar opinions. Reference one from `matter.yml`:

```yaml
ethics:
  disclosure_pack: "fl-24-1" # or aba-512, ca-2023, ny-2024, dc-388
```

**Every pack entry ships `verified: false`.** That is intentional. The maintainers of this repo are not your bar counsel. Read the source opinion, flip `verified: true`, sign your bar ID into `verified_by`. See [`disclosures/README.md`](./disclosures/README.md) for the contract.

`--strict` refuses to ship the artifact if the active disclosure is sourced from a `verified: false` pack.

## Routing safety

Matter assignment is the actual hard problem. Claude session logs aren't tagged. v1 uses cwd-prefix matching only — no file-content heuristics, no PII risk, no inference.

- If `routes[]` matches `$HOME`, `/`, or a 1–2 segment path, the artifact carries a non-removable warning banner. `--strict` refuses.
- Off-matter cwds appear in the Excluded section with a concrete fix: the exact `routes:` line to add if that cwd belongs to this matter.

## Chain of evidence

Every artifact embeds:

- Tool version + UTC generation timestamp
- SHA-256 of each source JSONL (path + bytes + hex digest)
- SHA-256 of `matter.yml` at generation
- SHA-256 of the active disclosure pack (if used)
- **Self-hash** of the artifact itself — replace the embedded hash with the literal sentinel `PENDING_SELF_HASH_REPLACE_AT_RENDER` and re-`sha256` the document to verify it has not been altered since generation
- Inline `matter.yml` snapshot (verbatim)

The audit packet HTML carries the same chain and a hand-signature block.

## Web version

Self-contained browser port at [`web/index.html`](./web/index.html) — single file, no build, no backend. Open directly or serve `web/` from any static server. The JSONL never leaves the page.

A polished UX is being scaffolded on Lovable (`https://lovable.dev/projects/732d1712-27ea-4db5-ab1e-9aa8030a7cce`); paste-ready brief at [`web/LOVABLE_PROMPT.md`](./web/LOVABLE_PROMPT.md). The bare `web/index.html` is the canonical fallback if Lovable drifts on the contract.

## Dry-run samples

- [`out/sample-draft.md`](./out/sample-draft.md) — broad-route case (intentionally bad `test-matter.yml`). Shows the warning banner in context.
- [`out/sample-draft-strict.md`](./out/sample-draft-strict.md) — strict-clean case (narrow routes, attorney info, disclosure override). Shows a real chain of evidence.
- [`out/sample-draft-strict.audit.html`](./out/sample-draft-strict.audit.html) — open in a browser to see the print-ready audit packet.

## What this is NOT

- Not a Clio API integration. Deliberately. Push-to-Clio is the malpractice-shaped feature most "AI billing" tools start with; this one ends there, after the lawyer has reviewed and signed.
- Not legal advice on any jurisdiction's rules. The pack is starter language; verification is the lawyer's job.
- Not an LLM-rewrite tool. Narratives are deterministic; the lawyer rewrites.
- Not a timer. This reconstructs time after the fact from existing session logs.

## Status

v0.2.0 — audit-defense rewrite. v1 spec in [`CONTINUE.md`](./CONTINUE.md); current todo in [`tasks/todo.md`](./tasks/todo.md).

## License

AGPL-3.0. The workflow is the public methodology; closed vendors that bake it into a product must open-source the derivative.
