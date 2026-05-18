#!/usr/bin/env node
// billable-time — draft time entries from Claude Code session logs.
// Lawyer reviews every row before anything hits a billing system.
//
// Usage:
//   node draft-entries.mjs --session <PATH.jsonl|DIR> --matter <matter.yml>
//                          [--since YYYY-MM-DD] [--until YYYY-MM-DD]
//                          [--idle-gap-min 5] [--out out/draft.md]
//                          [--include-prompt-snippet]
//
// All output is a markdown diff. NOTHING is auto-billed. This is the
// audit-surface artifact a lawyer signs off on.
//
// Narrative defaults to tool-shape only (drafted / reviewed / researched) to
// avoid leaking prompt text from unrelated sessions sharing the same Claude
// history. Use --include-prompt-snippet on single-matter machines to add a
// short prompt headline to each entry.

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { homedir } from "node:os";

// ---------- args ----------
function parseArgs(argv) {
  const args = { idleGapMin: 5, out: "out/draft.md" };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--session") {
      args.session = v;
      i++;
    } else if (k === "--matter") {
      args.matter = v;
      i++;
    } else if (k === "--since") {
      args.since = v;
      i++;
    } else if (k === "--until") {
      args.until = v;
      i++;
    } else if (k === "--idle-gap-min") {
      args.idleGapMin = Number(v);
      i++;
    } else if (k === "--out") {
      args.out = v;
      i++;
    } else if (k === "--include-prompt-snippet") {
      args.includePromptSnippet = true;
    } else if (k === "--help" || k === "-h") {
      args.help = true;
    }
  }
  return args;
}

function usage() {
  console.log(`billable-time — draft time entries from Claude Code session logs.

REQUIRED
  --session PATH       JSONL file OR directory of JSONL files
  --matter PATH        matter.yml describing the matter to bill against

OPTIONAL
  --since YYYY-MM-DD   inclusive start date (default: 24h ago)
  --until YYYY-MM-DD   inclusive end date   (default: today)
  --idle-gap-min N     minutes of inactivity that close an interval (default: 5)
  --out PATH           output markdown file (default: out/draft.md)
  --include-prompt-snippet
                       include a short prompt headline in each narrative.
                       OFF by default — prompts from unrelated sessions can
                       leak across matters when Claude history is shared.

The output is a markdown diff. Lawyer reviews every row. Nothing is auto-billed.`);
}

// ---------- minimal YAML loader for matter.yml ----------
// Supports: top-level keys, one nested level (key: with indented children),
// scalar values, "true"/"false"/numbers, quoted strings, and "- item" arrays.
function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, obj: root, key: null }];
  let arrayCtx = null;
  const lines = text.split(/\r?\n/);
  for (let raw of lines) {
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;
    if (line.trim().startsWith("#")) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    const trimmed = line.trim();

    if (trimmed.startsWith("- ")) {
      const val = coerce(trimmed.slice(2).trim());
      if (arrayCtx && arrayCtx.indent < indent) {
        arrayCtx.arr.push(val);
        continue;
      }
    }
    arrayCtx = null;

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent)
      stack.pop();
    const top = stack[stack.length - 1].obj;

    const m = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const valPart = m[2];

    if (valPart === "") {
      // could be object or array
      top[key] = {};
      const peekIdx = lines.indexOf(raw) + 1;
      const next = lines.slice(peekIdx).find((l) => l.trim());
      if (next && next.trim().startsWith("- ")) {
        top[key] = [];
        arrayCtx = { indent, arr: top[key] };
      } else {
        stack.push({ indent, obj: top[key], key });
      }
    } else {
      top[key] = coerce(valPart);
    }
  }
  return root;
}

function coerce(v) {
  v = v.trim();
  if (/^"(.*)"$/.test(v)) return v.slice(1, -1);
  if (/^'(.*)'$/.test(v)) return v.slice(1, -1);
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

// ---------- session log parsing ----------
async function loadJsonlFiles(sessionArg) {
  const p = resolve(expandHome(sessionArg));
  const s = await stat(p);
  if (s.isFile()) return [p];
  const entries = await readdir(p);
  return entries.filter((f) => f.endsWith(".jsonl")).map((f) => join(p, f));
}

function expandHome(p) {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

function parseJsonlLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

// Extract event records: { ts, kind, sessionId, cwd, prompt?, tools?, files? }
async function extractEvents(files) {
  const events = [];
  for (const f of files) {
    const text = await readFile(f, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      if (!raw.trim()) continue;
      const obj = parseJsonlLine(raw);
      if (!obj || !obj.timestamp) continue;
      const ts = new Date(obj.timestamp);
      if (isNaN(+ts)) continue;
      const base = {
        ts,
        sessionId: obj.sessionId,
        cwd: obj.cwd || null,
      };
      if (obj.type === "user" && obj.message?.content) {
        const text = extractText(obj.message.content);
        events.push({ ...base, kind: "user_prompt", text });
      } else if (obj.type === "assistant" && obj.message?.content) {
        const tools = extractTools(obj.message.content);
        const files = extractFiles(tools);
        events.push({
          ...base,
          kind: "assistant_turn",
          tools: tools.map((t) => t.name),
          files,
        });
      }
    }
  }
  events.sort((a, b) => +a.ts - +b.ts);
  return events;
}

function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((c) => c && c.type === "text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("\n")
    .trim();
}

function extractTools(content) {
  if (!Array.isArray(content)) return [];
  return content
    .filter((c) => c && c.type === "tool_use" && c.name)
    .map((c) => ({ name: c.name, input: c.input || {} }));
}

function extractFiles(tools) {
  const out = new Set();
  for (const t of tools) {
    const fp = t.input?.file_path || t.input?.path;
    if (typeof fp === "string") out.add(fp);
  }
  return [...out];
}

// ---------- matter routing ----------
function routesFor(matter, matterFilePath) {
  const explicit = (matter.routes || []).map(expandHome).map((p) => resolve(p));
  const fromDir = resolve(dirname(matterFilePath));
  return [...new Set([...explicit, fromDir])];
}

function cwdMatchesMatter(cwd, routes) {
  if (!cwd) return false;
  const c = resolve(cwd);
  return routes.some((r) => c === r || c.startsWith(r + "/"));
}

// Flag routes that are dangerously broad — anything matching $HOME or "/" will
// catch every Claude Code session regardless of subject. The output is still
// generated, but the artifact carries an explicit warning the reviewer sees
// before treating any row as on-matter.
function checkRoutes(routes) {
  const warnings = [];
  const home = resolve(homedir());
  for (const r of routes) {
    if (r === "/" || r === home) {
      warnings.push(
        `Route \`${r}\` matches your entire ${r === "/" ? "filesystem" : "home directory"}. Every Claude Code session in this window will be treated as on-matter — including work for other clients or non-billable side projects. Narrow \`matter.yml.routes\` to a specific matter directory before relying on this output.`,
      );
    }
  }
  return warnings;
}

// ---------- intervals ----------
function clusterIntervals(events, idleGapMs) {
  const intervals = [];
  let cur = null;
  for (const e of events) {
    if (!cur) {
      cur = newInterval(e);
      continue;
    }
    const gap = +e.ts - +cur.lastTs;
    if (gap > idleGapMs) {
      intervals.push(cur);
      cur = newInterval(e);
    } else {
      addToInterval(cur, e);
    }
  }
  if (cur) intervals.push(cur);
  return intervals;
}

function newInterval(e) {
  const i = {
    start: e.ts,
    end: e.ts,
    lastTs: e.ts,
    sessionId: e.sessionId,
    cwd: e.cwd,
    prompts: [],
    tools: new Map(),
    files: new Set(),
    promptCount: 0,
    turnCount: 0,
  };
  addToInterval(i, e);
  return i;
}

function addToInterval(i, e) {
  i.end = e.ts;
  i.lastTs = e.ts;
  if (!i.cwd && e.cwd) i.cwd = e.cwd;
  if (e.kind === "user_prompt") {
    i.promptCount++;
    if (e.text) i.prompts.push(e.text);
  } else if (e.kind === "assistant_turn") {
    i.turnCount++;
    for (const t of e.tools || []) i.tools.set(t, (i.tools.get(t) || 0) + 1);
    for (const f of e.files || []) i.files.add(f);
  }
}

// ---------- narrative synthesis (deterministic; lawyer edits) ----------
// opts.includePromptSnippet: opt-in. Off by default to avoid leaking prompt
// text from unrelated sessions sharing the same Claude history.
function synthesizeNarrative(interval, opts = {}) {
  const verbs = [];
  const toolNames = [...interval.tools.keys()];
  const has = (n) => toolNames.includes(n);
  if (has("Edit") || has("Write") || has("NotebookEdit"))
    verbs.push("drafted and revised");
  if (has("Read")) verbs.push("reviewed");
  if (has("Grep") || has("Glob") || has("WebSearch")) verbs.push("researched");
  if (has("Bash")) verbs.push("ran analysis");
  if (verbs.length === 0) verbs.push("analyzed and corresponded on");

  const lead = capitalize(verbs.join("; "));
  const promptHint = opts.includePromptSnippet
    ? headlineFromPrompts(interval.prompts)
    : "";
  const fileHint = describeFiles([...interval.files]);

  const parts = [
    `${lead} matter-related work product${promptHint ? ` — ${promptHint}` : ""}.`,
  ];
  if (fileHint) parts.push(fileHint);
  parts.push(`Reviewed AI-assisted output and adopted as own work product.`);
  return parts.join(" ");
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function headlineFromPrompts(prompts) {
  if (!prompts.length) return "";
  // pull the first non-trivial prompt, strip code fences, cap length
  const first = prompts.find((p) => p && p.length > 8) || prompts[0];
  const oneLine = first
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const capped = oneLine.length > 100 ? oneLine.slice(0, 97) + "..." : oneLine;
  return capped.replace(/[|]/g, "/");
}

function describeFiles(files) {
  if (!files.length) return "";
  const shown = files
    .slice(0, 3)
    .map((f) => basename(f))
    .join(", ");
  const extra = files.length > 3 ? ` (+${files.length - 3} more)` : "";
  return `Files touched: ${shown}${extra}.`;
}

// ---------- rounding ----------
function roundTenth(hours) {
  return Math.round(hours * 10) / 10;
}

// ---------- date helpers ----------
function dayBound(s, end = false) {
  if (!s) return null;
  const d = new Date(s + (end ? "T23:59:59.999Z" : "T00:00:00.000Z"));
  return isNaN(+d) ? null : d;
}

function fmt(ts) {
  return new Date(ts)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "Z");
}

function dur(ms) {
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h${mm}m` : `${mm}m`;
}

// ---------- markdown render ----------
function render({
  matter,
  intervals,
  excluded,
  args,
  sourceFiles,
  warnings = [],
}) {
  const m = matter.matter || {};
  const ethics = matter.ethics || {};
  const billing = matter.billing || {};
  const disclosureRequired = !!ethics.ai_disclosure_required;

  const totalHours = intervals.reduce(
    (acc, i) => acc + roundTenth((+i.end - +i.start) / 3600000),
    0,
  );

  const lines = [];
  lines.push(
    `# Draft time entries — ${m.caption || m.id || "unspecified matter"}`,
  );
  lines.push("");
  lines.push(
    `> Generated by \`billable-time\` ${new Date().toISOString().slice(0, 10)}. **Nothing has been billed.** Each row below is a proposal. Mark each row \`accept\` / \`edit\` / \`reject\` before exporting to Clio.`,
  );
  lines.push("");

  if (warnings.length) {
    lines.push(
      "> ⚠️ **Routing warnings — review before treating any row as on-matter:**",
    );
    for (const w of warnings) lines.push(`> - ${w}`);
    lines.push("");
  }

  lines.push(
    `**Matter:** ${m.id || "—"}  ·  **Client:** ${m.client || "—"}  ·  **Jurisdiction:** ${m.jurisdiction || "—"}  ·  **Rate:** ${billing.rate_per_hour ? `$${billing.rate_per_hour}/h` : "—"}`,
  );
  lines.push("");
  lines.push(
    `**AI disclosure required:** ${disclosureRequired ? "yes" : "no"}  ·  **Idle-gap threshold:** ${args.idleGapMin} min  ·  **Rounding:** nearest 0.1h  ·  **Prompt snippet in narrative:** ${args.includePromptSnippet ? "on" : "off (default)"}`,
  );
  lines.push("");
  lines.push(
    `**Window:** ${args.since || "(default 24h ago)"} → ${args.until || "(today)"}  ·  **Source files:** ${sourceFiles.length}  ·  **Proposed total: ${totalHours.toFixed(1)}h**`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  if (intervals.length === 0) {
    lines.push(
      "_No on-matter intervals detected in window. See **Excluded** below._",
    );
  } else {
    lines.push("## Proposed entries");
    lines.push("");
    intervals.forEach((i, idx) => {
      const hours = roundTenth((+i.end - +i.start) / 3600000);
      const minHours = billing.minimum_increment_hours || 0.1;
      const billable = Math.max(hours, minHours);
      lines.push(
        `### ${String(idx + 1).padStart(2, "0")}. ${fmt(i.start)} → ${fmt(i.end)}  ·  ${dur(+i.end - +i.start)}  ·  **${billable.toFixed(1)}h**`,
      );
      lines.push("");
      lines.push(`- **Status:** \`[ ] accept    [ ] edit    [ ] reject\``);
      lines.push(
        `- **Narrative (draft, lawyer edits):** ${synthesizeNarrative(i, { includePromptSnippet: args.includePromptSnippet })}`,
      );
      if (disclosureRequired && ethics.disclosure_text) {
        lines.push(`- **AI disclosure:** ${ethics.disclosure_text}`);
      }
      lines.push(
        `- **Signals:** ${i.promptCount} prompts · ${i.turnCount} assistant turns · ${i.files.size} files touched · cwd \`${i.cwd || "?"}\``,
      );
      lines.push("");
    });
  }

  lines.push("---");
  lines.push("");
  lines.push("## Excluded (for your review — not billed by default)");
  lines.push("");
  if (excluded.length === 0) {
    lines.push("_Nothing excluded in window._");
  } else {
    for (const x of excluded) lines.push(`- ${x}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Ethics note");
  lines.push("");
  lines.push(
    "This tool does not bill. It produces a reviewable draft. Time, narrative, and AI-disclosure language are subject to attorney review. The attorney of record is responsible for the final entries submitted to the client and the billing system. See `CONTINUE.md` for the design rationale.",
  );
  return lines.join("\n");
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.session || !args.matter) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const matterPath = resolve(expandHome(args.matter));
  if (!existsSync(matterPath)) {
    console.error(`matter.yml not found: ${matterPath}`);
    process.exit(2);
  }
  const matter = parseYaml(await readFile(matterPath, "utf8"));
  const routes = routesFor(matter, matterPath);
  const routeWarnings = checkRoutes(routes);

  const sourceFiles = await loadJsonlFiles(args.session);
  if (sourceFiles.length === 0) {
    console.error(`no .jsonl files at ${args.session}`);
    process.exit(2);
  }

  const since = dayBound(args.since) || new Date(Date.now() - 24 * 3600 * 1000);
  const until = dayBound(args.until, true) || new Date();

  const allEvents = await extractEvents(sourceFiles);
  const inWindow = allEvents.filter((e) => e.ts >= since && e.ts <= until);

  const onMatter = inWindow.filter((e) => cwdMatchesMatter(e.cwd, routes));
  const offMatter = inWindow.filter((e) => !cwdMatchesMatter(e.cwd, routes));

  const idleGapMs = args.idleGapMin * 60 * 1000;
  const intervals = clusterIntervals(onMatter, idleGapMs);

  // Exclusions: long-idle gaps (would have been billed if no threshold),
  // off-matter activity (different cwd), and trivial intervals (< 0.1h pre-rounding).
  const excluded = [];
  const trivialKept = [];
  const filtered = intervals.filter((i) => {
    const hrs = (+i.end - +i.start) / 3600000;
    if (hrs < 0.05 && i.promptCount <= 1) {
      trivialKept.push(
        `${fmt(i.start)} (${i.promptCount} prompt) — trivial, below 0.05h. Skipped.`,
      );
      return false;
    }
    return true;
  });

  for (const t of trivialKept) excluded.push(t);

  // Group off-matter activity by cwd
  const byCwd = new Map();
  for (const e of offMatter) {
    const k = e.cwd || "(no cwd)";
    byCwd.set(k, (byCwd.get(k) || 0) + 1);
  }
  for (const [k, n] of byCwd.entries()) {
    excluded.push(
      `Off-matter (cwd \`${k}\`) — ${n} events. Add to \`matter.yml.routes\` if this belongs to this matter.`,
    );
  }

  // Long gaps inside the window (waiting / overnight)
  for (let idx = 1; idx < filtered.length; idx++) {
    const gap = +filtered[idx].start - +filtered[idx - 1].end;
    const gapMin = Math.round(gap / 60000);
    if (gapMin >= args.idleGapMin && gapMin >= 30) {
      excluded.push(
        `Idle gap ${gapMin} min between ${fmt(filtered[idx - 1].end)} and ${fmt(filtered[idx].start)} — not billed (over idle threshold).`,
      );
    }
  }

  const md = render({
    matter,
    intervals: filtered,
    excluded,
    args,
    sourceFiles,
    warnings: routeWarnings,
  });

  const outPath = resolve(expandHome(args.out));
  await writeFile(outPath, md, "utf8");
  console.log(`wrote ${outPath}`);
  console.log(
    `intervals: ${filtered.length}  ·  on-matter events: ${onMatter.length}  ·  off-matter events: ${offMatter.length}`,
  );
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
