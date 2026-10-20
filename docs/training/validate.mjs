#!/usr/bin/env node
// Validates every question bank in docs/training/banks/.
// Usage: node docs/training/validate.mjs        (exit code 1 on any problem)
//
// Checks: bank shape, unique ids, per-type fields, answer indices in range,
// and that every path in `files` still exists in the repo, so a refactor
// that moves code shows up here instead of as a quiz that points nowhere.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const banksDir = join(here, "banks");

const TYPES = new Set(["mcq", "multi", "order", "text", "explain"]);
const errors = [];
const warnings = [];
const seenIds = new Set();
const banks = [];

for (const name of readdirSync(banksDir).filter((f) => f.endsWith(".js")).sort()) {
  const registered = [];
  const context = { QUIZ: { register: (bank) => registered.push(bank) } };
  try {
    vm.runInNewContext(readFileSync(join(banksDir, name), "utf8"), context, { filename: name });
  } catch (e) {
    errors.push(`${name}: failed to evaluate — ${e.message}`);
    continue;
  }
  if (registered.length !== 1) {
    errors.push(`${name}: expected exactly one QUIZ.register call, got ${registered.length}`);
    continue;
  }
  const bank = registered[0];
  banks.push({ name, bank });
  const where = (q, i) => `${name} #${i + 1}${q && q.id ? ` (${q.id})` : ""}`;

  for (const key of ["slug", "number", "title", "summary"]) {
    if (typeof bank[key] !== "string" || !bank[key].trim()) errors.push(`${name}: missing bank.${key}`);
  }
  if (!Array.isArray(bank.questions) || bank.questions.length === 0) {
    errors.push(`${name}: bank.questions must be a non-empty array`);
    continue;
  }

  bank.questions.forEach((q, i) => {
    const at = where(q, i);
    if (typeof q.id !== "string" || !q.id) errors.push(`${at}: missing id`);
    else if (seenIds.has(q.id)) errors.push(`${at}: duplicate id`);
    else seenIds.add(q.id);

    if (!TYPES.has(q.type)) errors.push(`${at}: unknown type "${q.type}"`);
    if (![1, 2, 3].includes(q.level)) errors.push(`${at}: level must be 1, 2 or 3`);
    if (!Array.isArray(q.topics) || q.topics.length === 0) errors.push(`${at}: topics must be a non-empty array`);
    if (typeof q.prompt !== "string" || !q.prompt.trim()) errors.push(`${at}: missing prompt`);
    if (typeof q.explain !== "string" || !q.explain.trim()) errors.push(`${at}: missing explain`);
    if (q.links !== undefined) {
      if (!Array.isArray(q.links) || q.links.some((l) => !l || typeof l.title !== "string" || !/^https:\/\/[^\s]+$/.test(l.url || ""))) {
        errors.push(`${at}: links must be [{ title, url: "https://…" }]`);
      }
    }
    if (q.code !== undefined && typeof q.code !== "string") errors.push(`${at}: code must be a string`);

    if (!Array.isArray(q.files) || q.files.length === 0) {
      errors.push(`${at}: files must list at least one repo path`);
    } else {
      for (const f of q.files) {
        if (typeof f !== "string" || !existsSync(join(repoRoot, f))) errors.push(`${at}: file not found — ${f}`);
      }
    }

    const choicesOk = Array.isArray(q.choices) && q.choices.length >= 2 && q.choices.every((c) => typeof c === "string" && c.trim());
    switch (q.type) {
      case "mcq":
        if (!choicesOk) errors.push(`${at}: mcq needs >= 2 string choices`);
        else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) errors.push(`${at}: mcq answer index out of range`);
        break;
      case "multi":
        if (!choicesOk) errors.push(`${at}: multi needs >= 2 string choices`);
        else if (!Array.isArray(q.answer) || q.answer.length === 0 || new Set(q.answer).size !== q.answer.length || q.answer.some((a) => !Number.isInteger(a) || a < 0 || a >= q.choices.length)) {
          errors.push(`${at}: multi answer must be unique in-range indices`);
        }
        break;
      case "order":
        if (!Array.isArray(q.items) || q.items.length < 3 || q.items.some((s) => typeof s !== "string" || !s.trim())) errors.push(`${at}: order needs >= 3 string items (in correct order)`);
        else if (new Set(q.items).size !== q.items.length) errors.push(`${at}: order items must be unique`);
        break;
      case "text":
        if (!Array.isArray(q.accept) || q.accept.length === 0 || q.accept.some((a) => typeof a !== "string" && Object.prototype.toString.call(a) !== "[object RegExp]")) {
          errors.push(`${at}: text needs accept: (string | RegExp)[]`);
        }
        break;
      case "explain":
        if (typeof q.model !== "string" || !q.model.trim()) errors.push(`${at}: explain needs a model answer`);
        if (!Array.isArray(q.rubric) || q.rubric.length < 2) errors.push(`${at}: explain needs >= 2 rubric points`);
        break;
    }
  });

  const counts = {};
  for (const q of bank.questions) counts[q.type] = (counts[q.type] || 0) + 1;
  const noLinks = bank.questions.filter((q) => !q.links || !q.links.length).length;
  if (noLinks) warnings.push(`${name}: ${noLinks} question(s) without links (fine when no official doc applies)`);
  if (bank.questions.length < 30) warnings.push(`${name}: only ${bank.questions.length} questions`);
  for (const t of TYPES) if (!counts[t]) warnings.push(`${name}: no "${t}" questions`);
}

const html = readFileSync(join(here, "index.html"), "utf8");
const tagged = new Set([...html.matchAll(/<script src="banks\/([^"]+\.js)"><\/script>/g)].map((m) => m[1]));
for (const { name } of banks) if (!tagged.has(name)) errors.push(`index.html: missing <script src="banks/${name}">`);
for (const name of tagged) if (!banks.some((b) => b.name === name)) warnings.push(`index.html: loads banks/${name}, which is missing or invalid`);

for (const { name, bank } of banks) {
  const byType = {};
  const byLevel = {};
  for (const q of bank.questions) {
    byType[q.type] = (byType[q.type] || 0) + 1;
    byLevel[q.level] = (byLevel[q.level] || 0) + 1;
  }
  console.log(`${name.padEnd(28)} ${String(bank.questions.length).padStart(3)} q  types ${JSON.stringify(byType)}  levels ${JSON.stringify(byLevel)}`);
}
for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
console.log(errors.length ? `\n${errors.length} error(s)` : `\nOK — ${seenIds.size} questions in ${banks.length} banks`);
process.exit(errors.length ? 1 : 0);
