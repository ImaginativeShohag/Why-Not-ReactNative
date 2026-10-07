/* Why-Not-ReactNative — training quiz engine.
   No build step and no dependencies. Each banks/*.js file calls QUIZ.register(bank);
   index.html calls QUIZ.start() after the banks have loaded. Progress lives in
   localStorage and is written on every answer, so a closed tab resumes where it was. */
(() => {
  "use strict";

  const STORAGE_KEY = "wnrn-training-v1";
  const DAY = 86_400_000;
  // Leitner boxes 1..5 → days until a question is due again. A miss drops to box 1.
  const BOX_DAYS = [0, 0, 1, 3, 7, 16];
  const TYPE_LABEL = { mcq: "Multiple choice", multi: "Select all", order: "Put in order", text: "Find in code", explain: "Explain" };
  const LEVEL_LABEL = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };
  const RESULT_LABEL = { correct: "Correct", partial: "Partly right", wrong: "Not quite" };
  const MODES = [
    ["all", "All questions"],
    ["new", "Unanswered"],
    ["missed", "Missed / partial"],
    ["due", "Due for review"],
  ];
  const EDITORS = { vscode: "VS Code", cursor: "Cursor", none: "No editor links" };

  const banks = [];
  const byId = new Map();
  let state;
  let session = null;
  let app;

  window.QUIZ = { register: (bank) => banks.push(bank), start };

  // ---------- text helpers ----------

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function inline(text) {
    return esc(text)
      .split(/(`[^`]+`)/)
      .map((part) =>
        part.length > 1 && part.startsWith("`") && part.endsWith("`")
          ? `<code>${part.slice(1, -1)}</code>`
          : part.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
      )
      .join("");
  }

  // Light markup: blank line = paragraph, "- " lines = bullets, `code`, **bold**.
  function md(text) {
    const out = [];
    for (const block of String(text).trim().split(/\n\s*\n/)) {
      let para = [];
      let list = [];
      const flushPara = () => {
        if (para.length) out.push(`<p>${para.map(inline).join("<br>")}</p>`);
        para = [];
      };
      const flushList = () => {
        if (list.length) out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`);
        list = [];
      };
      for (const line of block.split("\n")) {
        const bullet = /^\s*- (.*)$/.exec(line);
        if (bullet) {
          flushPara();
          list.push(bullet[1]);
        } else {
          flushList();
          para.push(line.trim());
        }
      }
      flushPara();
      flushList();
    }
    return out.join("");
  }

  // ---------- deterministic shuffles (same order every visit) ----------

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function perm(id, n, avoidIdentity = false) {
    let s = hash(id);
    const rand = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (avoidIdentity && n > 1 && a.every((v, i) => v === i)) a.push(a.shift());
    return a;
  }

  // ---------- persistence ----------

  const freshState = () => ({
    version: 1,
    q: {}, // id → { box, due, attempts, correct, last, answer, at }
    drafts: {}, // id → in-progress answer
    decks: {}, // deck key → { mode, levels, topic, id }
    last: null, // { hash, title, index, total }
    days: {}, // "YYYY-MM-DD" → answers that day
    settings: { editor: "vscode", repoRoot: "" },
  });

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.version === 1) {
        const base = freshState();
        return { ...base, ...saved, settings: { ...base.settings, ...saved.settings } };
      }
    } catch {
      /* corrupt or unavailable storage → start fresh */
    }
    return freshState();
  }

  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      showSaved(true);
    } catch {
      showSaved(false);
    }
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  }

  function showSaved(ok) {
    const el = document.getElementById("saved");
    if (!el) return;
    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    el.textContent = ok ? `Saved · ${t}` : "Could not save — storage blocked?";
    el.className = `qz-saved show${ok ? "" : " err"}`;
    clearTimeout(showSaved.timer);
    showSaved.timer = setTimeout(() => el.classList.remove("show"), 1600);
  }

  const dayKey = (time) => {
    const d = new Date(time);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  function record(id, result, answer) {
    const now = Date.now();
    const prev = state.q[id] || { box: 0, attempts: 0, correct: 0 };
    const r = { ...prev };
    if (result === "correct") r.box = Math.min(prev.box === 0 ? 2 : prev.box + 1, 5);
    else if (result === "partial") r.box = Math.max(prev.box, 1);
    else r.box = 1;
    r.due = now + BOX_DAYS[r.box] * DAY;
    r.attempts = prev.attempts + 1;
    r.correct = prev.correct + (result === "correct" ? 1 : 0);
    r.last = result;
    r.answer = answer;
    r.at = now;
    state.q[id] = r;
    delete state.drafts[id];
    state.days[dayKey(now)] = (state.days[dayKey(now)] || 0) + 1;
    save();
    return prev.attempts ? prev : null;
  }

  // ---------- stats ----------

  const isDue = (id, now = Date.now()) => {
    const r = state.q[id];
    return !!r && r.due <= now;
  };

  function stats(ids) {
    const now = Date.now();
    let answered = 0, correct = 0, due = 0, mastered = 0, boxes = 0;
    for (const id of ids) {
      const r = state.q[id];
      if (!r) continue;
      answered++;
      if (r.last === "correct") correct++;
      if (r.due <= now) due++;
      if (r.box >= 4) mastered++;
      boxes += r.box;
    }
    const total = ids.length;
    return {
      total, answered, correct, due, mastered,
      mastery: total ? Math.round((boxes / (total * 5)) * 100) : 0,
      accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    };
  }

  function streak() {
    const d = new Date();
    if (!state.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    let n = 0;
    while (state.days[dayKey(d)]) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  function dueLabel(r) {
    const days = Math.ceil((r.due - Date.now()) / DAY);
    return days <= 0 ? "due now" : `due in ${days}d`;
  }

  // ---------- grading ----------

  const norm = (s) =>
    String(s).trim().replace(/^[`'"]+|[`'"]+$/g, "").replace(/\(\)\s*;?$/, "").replace(/;$/, "").replace(/\s+/g, " ").toLowerCase();
  const baseName = (s) => s.split("/").pop();
  const noExt = (s) => s.replace(/\.(tsx?|jsx?|mjs|cjs|json|ya?ml|swift|kt|md|html)$/, "");
  const forms = (s) => [s, baseName(s), noExt(s), noExt(baseName(s))];

  function textMatches(q, input) {
    const raw = String(input).trim();
    if (!raw) return false;
    const mine = new Set(forms(norm(raw)));
    return q.accept.some((a) => {
      if (a instanceof RegExp) {
        return [raw, ...mine].some((f) => {
          a.lastIndex = 0;
          return a.test(f);
        });
      }
      return forms(norm(a)).some((f) => mine.has(f));
    });
  }

  function grade(q, answer) {
    switch (q.type) {
      case "mcq":
        return answer === q.answer ? "correct" : "wrong";
      case "multi": {
        const want = new Set(q.answer);
        const hits = answer.filter((i) => want.has(i)).length;
        const wrongPicks = answer.length - hits;
        if (!wrongPicks && hits === want.size) return "correct";
        if ((!wrongPicks && hits > 0) || (wrongPicks === 1 && hits === want.size)) return "partial";
        return "wrong";
      }
      case "order": {
        const inPlace = answer.filter((v, i) => v === i).length;
        if (inPlace === answer.length) return "correct";
        return inPlace / answer.length >= 0.5 ? "partial" : "wrong";
      }
      case "text":
        return textMatches(q, answer) ? "correct" : "wrong";
      default:
        return "wrong";
    }
  }

  // ---------- routing & decks ----------

  const bankBySlug = (slug) => banks.find((b) => b.slug === slug);
  const allIds = () => banks.flatMap((b) => b.questions.map((q) => q.id));

  function parseRoute() {
    const [kind, ...rest] = location.hash.replace(/^#\/?/, "").split("/");
    const arg = decodeURIComponent(rest.join("/"));
    if (kind === "quiz" && bankBySlug(arg)) {
      const b = bankBySlug(arg);
      return {
        view: "deck",
        source: {
          key: `bank:${b.slug}`, hash: `#/quiz/${b.slug}`, title: `${b.number} · ${b.title}`,
          summary: b.summary, doc: b.doc, ids: b.questions.map((q) => q.id),
        },
      };
    }
    if (kind === "review") {
      return {
        view: "deck",
        source: {
          key: "review", hash: "#/review", title: "Review due", forcedMode: "due", ids: allIds(),
          summary: "Spaced repetition across every project: questions you missed come back right away, ones you got right come back after 1, 3, 7 and 16 days.",
        },
      };
    }
    if (kind === "topic" && arg) {
      return {
        view: "deck",
        source: {
          key: `topic:${arg}`, hash: `#/topic/${encodeURIComponent(arg)}`, title: `Topic · ${arg}`, topicLocked: true,
          summary: `Every question tagged “${arg}”, across all projects.`,
          ids: allIds().filter((id) => byId.get(id).q.topics.includes(arg)),
        },
      };
    }
    return { view: "home" };
  }

  function filtersFor(src) {
    const d = state.decks[src.key] || {};
    return { mode: src.forcedMode || d.mode || "all", levels: d.levels || [], topic: src.topicLocked ? "" : d.topic || "" };
  }

  function setFilter(patch) {
    const key = session.src.key;
    state.decks[key] = { ...state.decks[key], ...patch, id: undefined };
    save();
    openSession(session.src, true);
    render();
  }

  function buildDeck(src, f) {
    const now = Date.now();
    return src.ids.filter((id) => {
      const { q } = byId.get(id);
      const r = state.q[id];
      if (f.levels.length && !f.levels.includes(q.level)) return false;
      if (f.topic && !q.topics.includes(f.topic)) return false;
      if (f.mode === "new") return !r;
      if (f.mode === "missed") return !!r && r.last !== "correct";
      if (f.mode === "due") return isDue(id, now);
      return true;
    });
  }

  // The deck is frozen for the visit, so answering a question in "Unanswered" mode
  // doesn't yank it out from under you.
  function openSession(src, force = false) {
    if (session && session.key === src.key && !force) {
      session.src = src;
      return;
    }
    const deck = buildDeck(src, filtersFor(src));
    const savedId = state.decks[src.key] && state.decks[src.key].id;
    session = {
      key: src.key, src, deck,
      index: Math.max(0, deck.indexOf(savedId)),
      results: {}, revealed: new Set(), retry: new Set(), rubric: {}, hints: new Set(), undo: {},
    };
  }

  const current = () => (session && session.index < session.deck.length ? byId.get(session.deck[session.index]) : null);

  function goTo(index) {
    session.index = Math.max(0, Math.min(index, session.deck.length));
    const entry = current();
    const key = session.src.key;
    state.decks[key] = { ...state.decks[key], id: entry ? entry.q.id : undefined };
    if (entry) state.last = { hash: session.src.hash, title: session.src.title, index: session.index, total: session.deck.length };
    save();
    render({ focus: true });
    document.querySelector(".qz-progress")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function phase(q) {
    if (session.results[q.id]) return "done";
    if (state.q[q.id] && filtersFor(session.src).mode === "all" && !session.retry.has(q.id)) return "done";
    if (q.type === "explain" && session.revealed.has(q.id)) return "reveal";
    return "answer";
  }

  const shownResult = (q) => {
    if (session.results[q.id]) return session.results[q.id];
    const r = state.q[q.id];
    return r ? { result: r.last, answer: r.answer } : null;
  };

  function draft(q) {
    const d = state.drafts[q.id];
    if (d !== undefined) return d;
    if (q.type === "multi") return [];
    if (q.type === "order") return perm(q.id, q.items.length, true);
    if (q.type === "mcq") return null;
    return "";
  }

  function setDraft(q, value, soon = false) {
    state.drafts[q.id] = value;
    soon ? saveSoon() : save();
  }

  // ---------- rendering: shared bits ----------

  function bar(pct, cls = "") {
    return `<div class="qz-bar ${cls}"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;
  }

  function repoRoot() {
    if (state.settings.repoRoot) return state.settings.repoRoot.replace(/\/+$/, "");
    if (location.protocol === "file:") {
      const path = decodeURIComponent(location.pathname);
      const i = path.lastIndexOf("/docs/training/");
      if (i >= 0) return path.slice(0, i);
    }
    return "";
  }

  function filesHtml(files) {
    const root = repoRoot();
    const editor = state.settings.editor;
    const rows = files
      .map((f) => {
        const open =
          root && editor !== "none"
            ? `<a class="qz-mini" href="${editor}://file${encodeURI(`${root}/${f}`)}">Open in ${EDITORS[editor]}</a>`
            : "";
        return `<li><code>${esc(f)}</code><button class="qz-mini" data-act="copy" data-path="${esc(f)}">Copy</button>${open}</li>`;
      })
      .join("");
    return `<div class="qz-files"><h4>Open first</h4><ul>${rows}</ul></div>`;
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // ---------- rendering: dashboard ----------

  function renderHome() {
    const ids = allIds();
    const all = stats(ids);
    const today = state.days[dayKey(Date.now())] || 0;
    const topics = new Map();
    for (const b of banks) for (const q of b.questions) for (const t of q.topics) topics.set(t, [...(topics.get(t) || []), q.id]);
    const topicRows = [...topics.entries()]
      .map(([name, tIds]) => ({ name, ...stats(tIds) }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    const resume = state.last
      ? `<a class="qz-resume" href="${esc(state.last.hash)}"><span>Resume</span><strong>${esc(state.last.title)}</strong><em>Question ${state.last.index + 1} of ${state.last.total}</em></a>`
      : "";

    const cards = banks
      .map((b) => {
        const s = stats(b.questions.map((q) => q.id));
        const verb = s.answered === 0 ? "Start" : s.answered < s.total ? "Continue" : "Revisit";
        return `<article class="qz-proj">
          <header><span class="qz-num">${esc(b.number)}</span><h3><a href="#/quiz/${b.slug}">${esc(b.title)}</a></h3></header>
          <p>${inline(b.summary)}</p>
          ${bar((s.answered / s.total) * 100)}
          <div class="qz-proj-stats">
            <span><strong>${s.answered}</strong>/${s.total} answered</span>
            <span><strong>${s.accuracy}%</strong> correct</span>
            <span><strong>${s.mastery}%</strong> mastery</span>
            ${s.due ? `<span class="due"><strong>${s.due}</strong> due</span>` : ""}
          </div>
          <footer>
            <a class="qz-btn primary" href="#/quiz/${b.slug}">${verb}</a>
            ${b.doc ? `<a class="qz-btn ghost" href="${esc(b.doc)}">Write-up</a>` : ""}
            <button class="qz-btn ghost danger" data-act="reset-bank" data-slug="${b.slug}">Reset</button>
          </footer>
        </article>`;
      })
      .join("");

    const topicHtml = topicRows
      .map(
        (t) => `<a class="qz-topic" href="#/topic/${encodeURIComponent(t.name)}">
          <span class="name">${esc(t.name)}</span><span class="count">${t.answered}/${t.total}</span>${bar(t.mastery, "slim")}<span class="pct">${t.mastery}%</span></a>`,
      )
      .join("");

    app.innerHTML = `
      <h1>React Native Training</h1>
      <p class="subtitle">Code-reading quizzes for every project in this repo. Open the files each question points to, work out the answer from the real code, then read why.</p>

      <div class="qz-tiles">
        <div><strong>${all.answered}<small>/${all.total}</small></strong><span>answered</span></div>
        <div><strong>${all.accuracy}%</strong><span>correct</span></div>
        <div><strong>${all.mastered}</strong><span>mastered (box 4+)</span></div>
        <div><strong>${all.mastery}%</strong><span>overall mastery</span></div>
        <div><strong>${streak()}</strong><span>day streak · ${today} today</span></div>
      </div>

      <div class="qz-row">
        ${resume}
        <a class="qz-review ${all.due ? "" : "empty"}" href="#/review"><span>Spaced repetition</span><strong>${all.due} due for review</strong><em>${all.due ? "Start review" : "Nothing due — keep answering"}</em></a>
      </div>

      <h2>Projects</h2>
      <div class="qz-grid">${cards}</div>

      <h2>Topics</h2>
      <p class="qz-dim">Mastery per topic across all projects. Click a topic to drill only those questions.</p>
      <div class="qz-topics">${topicHtml}</div>

      <h2>How it works</h2>
      <ul class="qz-how">
        <li><strong>Five question types.</strong> Multiple choice, select-all, put-in-order and find-in-code are graded for you. Explain questions are self-graded: write your answer, reveal the model answer and rubric, then mark yourself honestly.</li>
        <li><strong>Spaced repetition.</strong> Every question sits in a Leitner box. A correct answer moves it up (due again in 1, 3, 7, then 16 days); a miss drops it to box 1 and makes it due now. “Mastered” means box 4 or 5.</li>
        <li><strong>Auto-save.</strong> Every answer, draft and position is saved in this browser as you go. Close the tab whenever — Resume picks up on the same question. Use Export to back up or move to another browser.</li>
        <li><strong>Keyboard.</strong> <code>1</code>–<code>9</code> pick a choice · <code>Enter</code> submit / next · <code>←</code> <code>→</code> previous / next · <code>H</code> hint · <code>⌘/Ctrl+Enter</code> in an explain box reveals the model answer.</li>
      </ul>

      <h2>Data &amp; settings</h2>
      <div class="qz-settings">
        <div class="qz-field">
          <label for="set-editor">Open files in</label>
          <select id="set-editor" data-setting="editor">
            ${Object.entries(EDITORS).map(([k, v]) => `<option value="${k}" ${state.settings.editor === k ? "selected" : ""}>${v}</option>`).join("")}
          </select>
        </div>
        <div class="qz-field grow">
          <label for="set-root">Repo root (for editor links)</label>
          <input id="set-root" data-setting="repoRoot" value="${esc(state.settings.repoRoot)}" placeholder="${esc(repoRoot() || "/absolute/path/to/Why-Not-ReactNative")}" spellcheck="false">
        </div>
      </div>
      <div class="qz-data">
        <button class="qz-btn" data-act="export">Export progress</button>
        <button class="qz-btn" data-act="import">Import progress</button>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
        <button class="qz-btn ghost danger" data-act="reset-all">Reset everything</button>
      </div>`;
  }

  // ---------- rendering: quiz deck ----------

  function renderDeck(opts = {}) {
    const src = session.src;
    const f = filtersFor(src);
    const deck = session.deck;
    const entry = current();
    const topicsInSource = [...new Set(src.ids.flatMap((id) => byId.get(id).q.topics))].sort();

    const filters = `
      <div class="qz-filters">
        ${src.forcedMode ? "" : `<select data-filter="mode" aria-label="Mode">${MODES.map(([k, v]) => `<option value="${k}" ${f.mode === k ? "selected" : ""}>${v}</option>`).join("")}</select>`}
        <div class="qz-chips" role="group" aria-label="Difficulty">
          ${[1, 2, 3].map((l) => `<button class="qz-chip lvl-${l} ${f.levels.includes(l) ? "on" : ""}" data-act="level" data-level="${l}">${LEVEL_LABEL[l]}</button>`).join("")}
        </div>
        ${src.topicLocked ? "" : `<select data-filter="topic" aria-label="Topic"><option value="">All topics</option>${topicsInSource.map((t) => `<option ${f.topic === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`}
      </div>`;

    const dots = deck
      .map((id, i) => {
        const r = session.results[id] || (state.q[id] && { result: state.q[id].last });
        return `<button class="qz-dot ${r ? r.result : ""} ${i === session.index ? "cur" : ""}" data-act="jump" data-i="${i}" title="Question ${i + 1}" aria-label="Question ${i + 1}"></button>`;
      })
      .join("");

    let main;
    if (!deck.length) {
      main = `<div class="qz-empty"><h3>Nothing here</h3><p>No questions match these filters${f.mode === "due" ? " — nothing is due for review right now" : ""}.</p>
        ${src.forcedMode ? `<a class="qz-btn primary" href="#/">Back to dashboard</a>` : `<button class="qz-btn primary" data-act="clear-filters">Show all questions</button>`}</div>`;
    } else if (!entry) {
      main = finishHtml();
    } else {
      main = `<article class="qz-card" id="qz-card">${cardHtml(entry.q, entry.bank)}</article>`;
    }

    app.innerHTML = `
      <nav class="qz-crumbs"><a href="#/">← Dashboard</a>${src.doc ? ` · <a href="${esc(src.doc)}">Read the write-up</a>` : ""}</nav>
      <h1>${esc(src.title)}</h1>
      <p class="subtitle">${inline(src.summary)}</p>
      ${filters}
      ${deck.length ? `<div class="qz-progress"><div class="qz-progress-head"><span>${entry ? `Question <strong>${session.index + 1}</strong> of ${deck.length}` : `Finished ${deck.length} questions`}</span><span class="qz-dim">${stats(deck).answered}/${deck.length} answered</span></div><div class="qz-dots">${dots}</div></div>` : ""}
      ${main}
      ${entry ? `<div class="qz-nav"><button class="qz-btn" data-act="prev" ${session.index === 0 ? "disabled" : ""}>← Previous</button><button class="qz-btn" data-act="next">${session.index === deck.length - 1 ? "Finish" : "Next →"}</button></div>` : ""}`;

    if (opts.focus && entry) app.querySelector(".qz-text, .qz-essay:not([readonly])")?.focus({ preventScroll: true });
  }

  function finishHtml() {
    const results = Object.values(session.results);
    const count = (r) => results.filter((x) => x.result === r).length;
    const missed = session.deck.filter((id) => state.q[id] && state.q[id].last !== "correct").length;
    return `<div class="qz-empty qz-finish">
      <h3>Deck complete</h3>
      <p>This visit: <strong class="ok">${count("correct")}</strong> correct · <strong class="part">${count("partial")}</strong> partial · <strong class="bad">${count("wrong")}</strong> missed.</p>
      <p class="qz-dim">${missed ? `${missed} question${missed > 1 ? "s" : ""} in this deck still need work.` : "Every question in this deck is currently correct."}</p>
      <div class="qz-data">
        <button class="qz-btn" data-act="jump" data-i="0">Start over</button>
        ${missed && !session.src.forcedMode ? `<button class="qz-btn primary" data-act="set-mode" data-mode="missed">Practise missed</button>` : ""}
        <a class="qz-btn ghost" href="#/">Dashboard</a>
      </div></div>`;
  }

  function cardHtml(q, bank) {
    const ph = phase(q);
    const res = ph === "done" ? shownResult(q) : null;
    const r = state.q[q.id];
    const status = r ? `<span class="qz-badge box">Box ${r.box} · ${dueLabel(r)}</span>` : `<span class="qz-badge box new">New</span>`;
    const showBank = !session.src.key.startsWith("bank:");
    return `
      <div class="qz-meta">
        <span class="qz-badge type">${TYPE_LABEL[q.type]}</span>
        <span class="qz-badge lvl-${q.level}">${LEVEL_LABEL[q.level]}</span>
        ${showBank ? `<a class="qz-badge" href="#/quiz/${bank.slug}">${esc(bank.number)} · ${esc(bank.title)}</a>` : ""}
        ${q.topics.map((t) => `<a class="qz-badge topic" href="#/topic/${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}
        ${status}
      </div>
      <div class="qz-prompt">${md(q.prompt)}</div>
      ${q.code ? `<pre class="qz-code"><code>${esc(q.code)}</code></pre>` : ""}
      ${filesHtml(q.files)}
      ${q.hint && ph !== "done" ? (session.hints.has(q.id) ? `<div class="qz-hint">${md(q.hint)}</div>` : `<button class="qz-link" data-act="hint">Show hint (H)</button>`) : ""}
      <div class="qz-body">${bodyHtml(q, ph, res)}</div>
      ${res ? `<div class="qz-result ${res.result}">${RESULT_LABEL[res.result] || ""}</div><div class="qz-explain"><h4>Why</h4>${md(q.explain)}</div>` : ""}
      <div class="qz-actions">${actionsHtml(q, ph, res)}</div>`;
  }

  function bodyHtml(q, ph, res) {
    const done = ph === "done";
    const ans = done ? res.answer : draft(q);
    switch (q.type) {
      case "mcq":
      case "multi": {
        const multi = q.type === "multi";
        const want = new Set(multi ? q.answer : [q.answer]);
        const picked = new Set(multi ? ans || [] : ans === null || ans === undefined ? [] : [ans]);
        return `<div class="qz-choices ${multi ? "multi" : ""}">${perm(q.id, q.choices.length)
          .map((ci, k) => {
            let cls = picked.has(ci) ? "selected" : "";
            let tag = "";
            if (done) {
              if (want.has(ci) && picked.has(ci)) [cls, tag] = ["right", "✓"];
              else if (want.has(ci)) [cls, tag] = [multi ? "missed" : "right", multi ? "missed" : "✓"];
              else if (picked.has(ci)) [cls, tag] = ["wrong", "✗"];
              else cls = "dim";
            }
            return `<button class="qz-choice ${cls}" data-act="${multi ? "toggle" : "pick"}" data-i="${ci}" ${done ? "disabled" : ""}>
              <span class="key">${multi ? (picked.has(ci) ? "☑" : "☐") : k + 1}</span><span class="txt">${inline(q.choices[ci])}</span>${tag ? `<span class="tag">${tag}</span>` : ""}</button>`;
          })
          .join("")}</div>`;
      }
      case "order": {
        const rows = (ans || [])
          .map((ii, pos) => {
            const cls = done ? (ii === pos ? "right" : "wrong") : "";
            const controls = done
              ? ""
              : `<span class="btns"><button data-act="up" data-pos="${pos}" ${pos === 0 ? "disabled" : ""} aria-label="Move up">↑</button><button data-act="down" data-pos="${pos}" ${pos === ans.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button></span>`;
            return `<li class="qz-order-row ${cls}" ${done ? "" : `draggable="true"`} data-pos="${pos}"><span class="grip">${done ? (ii === pos ? "✓" : "✗") : "⋮⋮"}</span><span class="num">${pos + 1}</span><span class="txt">${inline(q.items[ii])}</span>${controls}</li>`;
          })
          .join("");
        const correct = done && res.result !== "correct"
          ? `<h4>Correct order</h4><ol class="qz-correct-order">${q.items.map((t) => `<li>${inline(t)}</li>`).join("")}</ol>`
          : "";
        return `${done ? "<h4>Your order</h4>" : `<p class="qz-dim">Drag rows, or use the arrows.</p>`}<ol class="qz-order">${rows}</ol>${correct}`;
      }
      case "text": {
        if (!done) return `<input class="qz-text" value="${esc(ans)}" placeholder="Type your answer, then Enter" autocomplete="off" autocapitalize="off" spellcheck="false">`;
        const accepted = q.accept.map((a) => (a instanceof RegExp ? `<code>${esc(String(a))}</code>` : `<code>${esc(a)}</code>`)).join(" ");
        return `<div class="qz-yours ${res.result}"><span>Your answer</span><code>${esc(res.answer || "—")}</code></div><p class="qz-accepted"><span>Accepted:</span> ${accepted}</p>`;
      }
      case "explain": {
        if (ph === "answer") return `<textarea class="qz-essay" rows="7" placeholder="Explain in your own words. ⌘/Ctrl+Enter reveals the model answer.">${esc(ans)}</textarea>`;
        const checked = session.rubric[q.id] || new Set();
        const rubric = q.rubric
          .map((p, i) =>
            done
              ? `<li>${inline(p)}</li>`
              : `<li><label><input type="checkbox" data-rubric="${i}" ${checked.has(i) ? "checked" : ""}> ${inline(p)}</label></li>`,
          )
          .join("");
        return `<h4>Your answer</h4><div class="qz-essay-read">${esc(ans || "(left blank)")}</div>
          <h4>Model answer</h4><div class="qz-model">${md(q.model)}</div>
          <h4>${done ? "Rubric" : "Tick each point your answer covered"}</h4><ul class="qz-rubric">${rubric}</ul>`;
      }
      default:
        return "";
    }
  }

  function actionsHtml(q, ph, res) {
    if (ph === "answer") {
      const label = q.type === "explain" ? "Reveal model answer" : "Submit";
      return `<button class="qz-btn primary" data-act="submit">${label}</button><button class="qz-btn ghost" data-act="next">Skip</button>`;
    }
    if (ph === "reveal") {
      const ticked = (session.rubric[q.id] || new Set()).size;
      const ratio = ticked / q.rubric.length;
      const suggest = ratio >= 0.8 ? "correct" : ratio >= 0.4 ? "partial" : "wrong";
      return `<span class="qz-dim">How did you do? (${ticked}/${q.rubric.length} points)</span>
        ${["correct", "partial", "wrong"]
          .map((g) => `<button class="qz-btn grade-${g} ${g === suggest ? "suggested" : ""}" data-act="grade" data-grade="${g}">${{ correct: "Got it", partial: "Partly", wrong: "Missed it" }[g]}</button>`)
          .join("")}`;
    }
    const override = q.type === "text" && res && res.result === "wrong" && session.results[q.id]
      ? `<button class="qz-btn ghost" data-act="override" title="Use when your answer is right but phrased differently">I was right — count it</button>`
      : "";
    return `<button class="qz-btn ghost" data-act="retry">Retry</button>${override}<button class="qz-btn primary" data-act="next">${session.index === session.deck.length - 1 ? "Finish" : "Next →"}</button>`;
  }

  function render(opts) {
    const route = parseRoute();
    if (route.view === "deck") {
      openSession(route.source);
      renderDeck(opts);
    } else {
      session = null;
      renderHome();
    }
  }

  // ---------- actions ----------

  function submit() {
    const { q } = current();
    const ans = draft(q);
    if (q.type === "mcq" && (ans === null || ans === undefined)) return toast("Pick an answer first.");
    if (q.type === "multi" && !ans.length) return toast("Select at least one option.");
    if (q.type === "text" && !String(ans).trim()) return toast("Type an answer first.");
    if (q.type === "explain") {
      if (String(ans).trim().length < 20 && !confirm("Writing your own answer first is where the learning happens. Reveal the model answer anyway?")) return;
      session.revealed.add(q.id);
      return renderDeck();
    }
    complete(q, grade(q, ans), q.type === "order" ? [...ans] : ans);
  }

  function complete(q, result, answer) {
    session.undo[q.id] = { prev: record(q.id, result, answer), before: state.q[q.id] };
    session.results[q.id] = { result, answer };
    session.retry.delete(q.id);
    session.revealed.delete(q.id);
    delete session.rubric[q.id];
    renderDeck();
  }

  function override() {
    const { q } = current();
    const undo = session.undo[q.id];
    if (undo) {
      // Roll back the wrong attempt, then record it as correct.
      if (undo.prev) state.q[q.id] = undo.prev;
      else delete state.q[q.id];
      const today = dayKey(Date.now());
      state.days[today] = Math.max(0, (state.days[today] || 1) - 1);
    }
    complete(q, "correct", session.results[q.id].answer);
  }

  function moveOrder(q, from, to) {
    const d = [...draft(q)];
    if (to < 0 || to >= d.length) return;
    const [item] = d.splice(from, 1);
    d.splice(to, 0, item);
    setDraft(q, d);
    renderDeck();
  }

  const actions = {
    pick(el) {
      setDraft(current().q, Number(el.dataset.i));
      renderDeck();
    },
    toggle(el) {
      const { q } = current();
      const i = Number(el.dataset.i);
      const d = draft(q);
      setDraft(q, d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort((a, b) => a - b));
      renderDeck();
    },
    up: (el) => moveOrder(current().q, Number(el.dataset.pos), Number(el.dataset.pos) - 1),
    down: (el) => moveOrder(current().q, Number(el.dataset.pos), Number(el.dataset.pos) + 1),
    submit,
    override,
    grade: (el) => {
      const { q } = current();
      complete(q, el.dataset.grade, draft(q));
    },
    hint() {
      session.hints.add(current().q.id);
      renderDeck();
    },
    retry() {
      const { q } = current();
      delete session.results[q.id];
      delete state.drafts[q.id];
      session.retry.add(q.id);
      save();
      renderDeck({ focus: true });
    },
    next: () => goTo(session.index + 1),
    prev: () => goTo(session.index - 1),
    jump: (el) => goTo(Number(el.dataset.i)),
    level(el) {
      const l = Number(el.dataset.level);
      const levels = filtersFor(session.src).levels;
      setFilter({ levels: levels.includes(l) ? levels.filter((x) => x !== l) : [...levels, l].sort() });
    },
    "set-mode": (el) => setFilter({ mode: el.dataset.mode }),
    "clear-filters": () => setFilter({ mode: "all", levels: [], topic: "" }),
    copy(el) {
      const path = el.dataset.path;
      (navigator.clipboard ? navigator.clipboard.writeText(path) : Promise.reject())
        .then(() => toast(`Copied ${path}`))
        .catch(() => window.prompt("Copy this path:", path));
    },
    export() {
      const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `wnrn-training-progress-${dayKey(Date.now())}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    import: () => document.getElementById("import-file").click(),
    "reset-bank"(el) {
      const b = bankBySlug(el.dataset.slug);
      if (!confirm(`Reset all progress for “${b.title}”?`)) return;
      for (const q of b.questions) {
        delete state.q[q.id];
        delete state.drafts[q.id];
      }
      delete state.decks[`bank:${b.slug}`];
      if (state.last && state.last.hash === `#/quiz/${b.slug}`) state.last = null;
      save();
      renderHome();
    },
    "reset-all"() {
      if (!confirm("Erase ALL quiz progress in this browser? Export first if you want a backup.")) return;
      state = { ...freshState(), settings: state.settings };
      save();
      renderHome();
    },
  };

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || data.version !== 1 || typeof data.q !== "object") throw new Error("not a progress file");
        if (!confirm("Replace the current progress with the imported file?")) return;
        const base = freshState();
        delete data.exportedAt;
        state = { ...base, ...data, settings: { ...base.settings, ...data.settings } };
        save();
        session = null;
        render();
        toast("Progress imported.");
      } catch (e) {
        toast(`Import failed: ${e.message}`);
      }
    };
    reader.readAsText(file);
  }

  // ---------- events ----------

  function bindEvents() {
    app.addEventListener("click", (e) => {
      const el = e.target.closest("[data-act]");
      if (el && actions[el.dataset.act]) {
        e.preventDefault();
        actions[el.dataset.act](el);
      }
    });

    app.addEventListener("input", (e) => {
      const t = e.target;
      if (t.matches(".qz-text, .qz-essay")) setDraft(current().q, t.value, true);
      else if (t.dataset.setting === "repoRoot") {
        state.settings.repoRoot = t.value.trim();
        saveSoon();
      }
    });

    app.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.filter) setFilter({ [t.dataset.filter]: t.value });
      else if (t.dataset.setting === "editor") {
        state.settings.editor = t.value;
        save();
      } else if (t.id === "import-file" && t.files[0]) importFile(t.files[0]);
      else if (t.dataset.rubric !== undefined) {
        const id = current().q.id;
        const set = session.rubric[id] || (session.rubric[id] = new Set());
        t.checked ? set.add(Number(t.dataset.rubric)) : set.delete(Number(t.dataset.rubric));
        app.querySelector(".qz-actions").innerHTML = actionsHtml(current().q, "reveal", null);
      }
    });

    // Drag-and-drop for order questions.
    let dragFrom = null;
    app.addEventListener("dragstart", (e) => {
      const row = e.target.closest(".qz-order-row");
      if (!row) return;
      dragFrom = Number(row.dataset.pos);
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(dragFrom));
    });
    app.addEventListener("dragover", (e) => {
      if (dragFrom === null) return;
      const row = e.target.closest(".qz-order-row");
      if (!row) return;
      e.preventDefault();
      app.querySelectorAll(".qz-order-row.over").forEach((r) => r.classList.remove("over"));
      row.classList.add("over");
    });
    app.addEventListener("drop", (e) => {
      const row = e.target.closest(".qz-order-row");
      if (dragFrom === null || !row) return;
      e.preventDefault();
      const to = Number(row.dataset.pos);
      const from = dragFrom;
      dragFrom = null;
      if (from !== to) moveOrder(current().q, from, to);
      else renderDeck();
    });
    app.addEventListener("dragend", () => {
      dragFrom = null;
      app.querySelectorAll(".qz-order-row").forEach((r) => r.classList.remove("dragging", "over"));
    });

    document.addEventListener("keydown", (e) => {
      if (!session || e.altKey) return;
      const entry = current();
      const t = e.target;
      const typing = t.matches && t.matches("input, textarea, select");
      if (typing) {
        if (t.matches(".qz-text") && e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (t.matches(".qz-essay") && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          submit();
        }
        return;
      }
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight") return goTo(session.index + 1);
      if (e.key === "ArrowLeft") return goTo(session.index - 1);
      if (!entry) return;
      const { q } = entry;
      const ph = phase(q);
      if (e.key === "Enter") {
        e.preventDefault();
        if (ph === "answer") submit();
        else if (ph === "done") goTo(session.index + 1);
      } else if ((e.key === "h" || e.key === "H") && q.hint) actions.hint();
      else if (/^[1-9]$/.test(e.key) && ph === "answer" && (q.type === "mcq" || q.type === "multi")) {
        const ci = perm(q.id, q.choices.length)[Number(e.key) - 1];
        if (ci === undefined) return;
        if (q.type === "mcq") setDraft(q, ci);
        else {
          const d = draft(q);
          setDraft(q, d.includes(ci) ? d.filter((x) => x !== ci) : [...d, ci].sort((a, b) => a - b));
        }
        renderDeck();
      }
    });

    window.addEventListener("hashchange", () => {
      render({ focus: true });
      window.scrollTo(0, 0);
    });
    window.addEventListener("pagehide", save);
  }

  function start() {
    app = document.getElementById("app");
    for (const bank of banks) for (const q of bank.questions) byId.set(q.id, { q, bank });
    banks.sort((a, b) => a.number.localeCompare(b.number));
    state = loadState();
    bindEvents();
    render({ focus: true });
  }
})();
