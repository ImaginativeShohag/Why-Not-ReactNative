#!/usr/bin/env node
// Checks every `links[].url` in docs/training/banks/ over the network.
// Usage: node docs/training/check-links.mjs   (needs internet; exit code 1 on any failure)
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const banksDir = join(dirname(fileURLToPath(import.meta.url)), "banks");
const urls = new Map();
for (const name of readdirSync(banksDir).filter((f) => f.endsWith(".js")).sort()) {
  let bank;
  vm.runInNewContext(readFileSync(join(banksDir, name), "utf8"), { QUIZ: { register: (b) => (bank = b) } });
  for (const q of bank.questions) for (const l of q.links || []) {
    if (!urls.has(l.url)) urls.set(l.url, []);
    urls.get(l.url).push(q.id);
  }
}
let bad = 0;
for (const [url, ids] of urls) {
  const base = url.split("#")[0];
  let status = 0;
  try {
    status = (await fetch(base, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": "Mozilla/5.0" } })).status;
  } catch (e) { status = e.name; }
  if (status !== 200) { bad++; console.error(`${status}  ${url}  (${ids.join(", ")})`); }
}
console.log(bad ? `\n${bad} of ${urls.size} URLs failed` : `OK — ${urls.size} URLs reachable`);
process.exit(bad ? 1 : 0);
