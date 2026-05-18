# billable-time — todo

## v0.1 — DONE

- [x] CLI prototype with deterministic narrative, cwd-prefix routing, sample dry-run
- [x] Self-contained browser port (`web/index.html`)
- [x] Public GitHub repo + AGPL-3.0
- [x] Lawvable skill package at `~/.claude/skills/billable-time/`
- [x] Lovable scaffolding brief at `web/LOVABLE_PROMPT.md`
- [x] Artifact-credibility fixes: tool-shape narrative default, broad-route warning banner

## v0.2.0 — true-to-purpose audit-defense rewrite (SHIPPED 2026-05-18)

**Polestar:** every change sharpens "this is the artifact that survives a bar grievance asking _show me how you billed AI-assisted work._"

### Phase A — cryptographic chain of evidence (DONE)

- [x] SHA-256 of each source JSONL embedded in artifact
- [x] SHA-256 of `matter.yml` at generation
- [x] Artifact self-hash, verifiable by sentinel-replace + re-hash
- [x] Tool version + UTC timestamp + inline matter.yml snapshot
- [x] Version bumped to 0.2.0 (CLI, SKILL.md, package.json)

### Phase B — bar-opinion disclosure pack (DONE)

- [x] `disclosures/aba-512.yml`, `ca-2023.yml`, `fl-24-1.yml`, `ny-2024.yml`, `dc-388.yml`
- [x] `disclosures/README.md` — verified-by-lawyer contract
- [x] `matter.yml.ethics.disclosure_pack: <code>` resolves canonical text
- [x] Pack SHA-256 embedded in artifact
- [x] Every pack ships `verified: false` — lawyer's job to flip after verifying

### Phase C — disclosure + routing enforcement (DONE)

- [x] `--strict` mode refuses on broad routes, missing attorney, missing disclosure
- [x] `matter.yml.attorney` schema (`name`, `bar_id`, `bar_jurisdiction`)
- [x] Pack `verified: false` blocks `--strict` unless `matter.yml` overrides text
- [x] Placeholder disclosure detection (`TODO`, `[fill in]`, empty)

### Phase D — narrative content layer (DONE)

- [x] Filename verb table (25 patterns: motion, brief, memo, complaint, answer, opposition, reply, order, contract, agreement, letter, exhibit, deposition, affidavit, declaration, discovery, interrogatories, lease, NDA, term sheet, settlement, will, POA, trust, transcript)
- [x] Directory verb fallback
- [x] Tool-shape verbs as final fallback
- [x] Prompt-snippet remains OFF by default (privacy invariant)

### Phase E — audit packet HTML (DONE)

- [x] `<out>.audit.html` companion emitted alongside `<out>.md`
- [x] Print-ready CSS (letter page, page-break-inside avoid, attorney signature block)
- [x] Chain of evidence table, source-file hash table, matter.yml snapshot
- [x] `--no-audit-packet` flag to skip

### Phase F — Excluded section made specific (DONE)

- [x] Off-matter entries cite the exact `routes:` line to add
- [x] Idle gaps cite duration + start/end + threshold
- [x] Trivial intervals cite start, prompt count, threshold

### Phase G — README + SKILL.md sharpened (DONE)

- [x] README leads with the legal threat (ABA 512, FL 24-1, CA, NY, DC)
- [x] Non-negotiable contract section
- [x] `--strict` mode documented as audit-final pass
- [x] SKILL.md rewritten in defense mode (hard refusals, pre-flight, refusal-first reporting)

### Phase H — tests (DONE)

- [x] `test/cli.test.mjs` — 15 invariant tests, all green
- [x] Self-hash reproducibility (the audit-defense bedrock)
- [x] All `--strict` refusal paths
- [x] Privacy default (prompt snippet off)
- [x] Source SHA-256 matches actual file hash
- [x] Filename verbs fire (motion + affidavit)
- [x] Audit packet emission and `--no-audit-packet`
- [x] Strict-clean pass when invariants hold
- [x] `npm test` script in `package.json` (zero deps)

### Phase I — web port mirrored to v0.2.0 (DONE)

- [x] Hash chain via SubtleCrypto
- [x] Bundled disclosure packs inline as JS constants
- [x] Strict-mode toggle in UI
- [x] Filename + directory verb tables ported
- [x] Audit packet HTML download alongside .md download

### Phase J — ship (in progress)

- [x] Regenerated `out/sample-draft.md` (broad-route demo)
- [x] Regenerated `out/sample-draft-strict.md` (strict-clean demo)
- [x] Both `.audit.html` companions emitted
- [ ] Commit + push to GitHub
- [ ] Re-bundle `~/.claude/skills/billable-time/`, re-zip Desktop
- [ ] Update CONTINUE.md with v0.2.0 shipping notes

## Distribution (still pending from v0.1)

- [ ] Scaffold the Lovable project `732d1712` from the brief (Stephane runs)
- [ ] LinkedIn post — frame as the audit primitive nobody is building

## Out of scope (deferred to v0.3+)

- Calendar cross-reference (Google/Outlook OAuth)
- In-session matter chip / slash command
- Clio API integration
- Two-pass signoff mode (lawyer-signs-each-row UI)
- LLM-generated narratives (intentionally never)
- Multi-matter mode in one run
- VS Code / Cursor extension
- File-content PII heuristics for matter routing
