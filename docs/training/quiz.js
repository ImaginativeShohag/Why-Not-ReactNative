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
  const THEMES = { system: "Match system", dark: "Dark", light: "Light" };

  // Lucide-style 24×24 stroke paths.
  const ICONS = {
    rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
    book: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
    camera: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    bag: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    headphones: "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3",
    grid: "M9 3v18M15 3v18M3 9h18M3 15h18",
    layers: "M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    check: "M20 6 9 17l-5-5",
    x: "M18 6 6 18M6 6l12 12",
    minus: "M5 12h14",
    flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0z",
    repeat: "M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
    folder: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z",
    copy: "M20 8H10a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2",
    external: "M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
    sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41",
    moon: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z",
    right: "M5 12h14M12 5l7 7-7 7",
    left: "M19 12H5M12 19l-7-7 7-7",
    chevron: "m9 18 6-6-6-6",
    bulb: "M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14",
    keyboard: "M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM6 9h.01M10 9h.01M14 9h.01M18 9h.01M8 13h.01M12 13h.01M16 13h.01M7 16h10",
    brain: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18zM12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18zM12 5v13",
    save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
    download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
    upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
    trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    play: "M6 3l14 9-14 9z",
    sparkles: "M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3zM5 3v4M3 5h4M19 17v4M17 19h4",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    list: "M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13",
    grip: "M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01",
    up: "m18 15-6-6-6 6",
    down: "m6 9 6 6 6-6",
    code: "m16 18 6-6-6-6M8 6l-6 6 6 6",
    pen: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
    sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  };
  const ic = (name, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
  const TYPE_ICON = { mcq: "target", multi: "list", order: "layers", text: "search", explain: "pen" };

  // Per-project icon and gradient, keyed by bank slug. Unknown slugs fall back to the brand look.
  const LOOKS = {
    launcher: ["rocket", "#6366f1", "#a855f7"],
    "offline-journal": ["book", "#10b981", "#0ea5e9"],
    "camera-social": ["camera", "#ec4899", "#f97316"],
    store: ["bag", "#f59e0b", "#ef4444"],
    "fitness-tracker": ["activity", "#22c55e", "#06b6d4"],
    "podcast-player": ["headphones", "#8b5cf6", "#d946ef"],
    "tic-tac-toe": ["grid", "#0ea5e9", "#6366f1"],
  };
  const look = (slug) => LOOKS[slug] || ["layers", "#6366f1", "#22d3ee"];
  const lookStyle = (slug) => `--c1:${look(slug)[1]};--c2:${look(slug)[2]}`;
  const tileIcon = (slug) => `<span class="qz-tile-icon" style="${lookStyle(slug)}">${ic(look(slug)[0])}</span>`;

  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const banks = [];
  const byId = new Map();
  const meters = new Map(); // meter key → last shown value, so bars and rings animate from where they were
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
    settings: { editor: "vscode", repoRoot: "", theme: "system" },
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
          eyebrow: `Module ${b.number}`, heading: b.title, number: b.number,
          summary: b.summary, doc: b.doc, ids: b.questions.map((q) => q.id),
        },
      };
    }
    if (kind === "review") {
      return {
        view: "deck",
        source: {
          key: "review", hash: "#/review", title: "Review due", forcedMode: "due", ids: allIds(),
          eyebrow: "Spaced repetition", heading: "Review due",
          summary: "Spaced repetition across every project: questions you missed come back right away, ones you got right come back after 1, 3, 7 and 16 days.",
        },
      };
    }
    if (kind === "topic" && arg) {
      return {
        view: "deck",
        source: {
          key: `topic:${arg}`, hash: `#/topic/${encodeURIComponent(arg)}`, title: `Topic · ${arg}`, topicLocked: true,
          eyebrow: "Topic drill", heading: arg,
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
      results: {}, revealed: new Set(), retry: new Set(), rubric: {}, hints: new Set(), undo: {}, pop: null,
    };
  }

  const current = () => (session && session.index < session.deck.length ? byId.get(session.deck[session.index]) : null);

  function goTo(index) {
    const from = session.index;
    session.index = Math.max(0, Math.min(index, session.deck.length));
    const entry = current();
    const key = session.src.key;
    state.decks[key] = { ...state.decks[key], id: entry ? entry.q.id : undefined };
    if (entry) state.last = { hash: session.src.hash, title: session.src.title, index: session.index, total: session.deck.length };
    save();
    render({ focus: true, dir: session.index < from ? "back" : "fwd" });
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

  const clampPct = (n) => Math.max(0, Math.min(100, Math.round(n) || 0));
  const keyAttr = (key) => (key ? ` data-key="${esc(key)}"` : "");

  // Bars and rings render empty and grow to data-value in animate(). A data-key remembers the last
  // value shown, so a re-render grows from where it was instead of from zero.
  function bar(pct, cls = "", key = "") {
    return `<div class="qz-bar ${cls}"><span data-meter="bar" data-value="${clampPct(pct)}"${keyAttr(key)}></span></div>`;
  }

  function ring(pct, { size = 120, stroke = 10, key = "", label = "", sub = "", cls = "" } = {}) {
    const r = (size - stroke) / 2;
    const c = (2 * Math.PI * r).toFixed(2);
    const mid = size / 2;
    return `<div class="qz-ring ${cls}" style="--size:${size}px">
      <svg viewBox="0 0 ${size} ${size}"><circle class="track" cx="${mid}" cy="${mid}" r="${r}" stroke-width="${stroke}"/>
      <circle class="val" cx="${mid}" cy="${mid}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-meter="ring" data-c="${c}" data-value="${clampPct(pct)}"${keyAttr(key)}/></svg>
      <div class="qz-ring-label"><div>${label}${sub ? `<span>${sub}</span>` : ""}</div></div></div>`;
  }

  // A number that counts up from its last shown value.
  const num = (n, key) => `<span data-count="${n}"${keyAttr(key)}>${n}</span>`;

  const KEYS = [
    ["Pick a choice", ["1", "–", "9"]],
    ["Submit / next", ["Enter"]],
    ["Previous / next", ["←", "→"]],
    ["Show hint", ["H"]],
    ["Reveal model answer", ["⌘/Ctrl", "Enter"]],
  ];
  const keysHtml = () =>
    KEYS.map(([label, ks]) => `<div><span>${label}</span><span>${ks.map((k) => (k === "–" ? "–" : `<kbd>${k}</kbd>`)).join("")}</span></div>`).join("");

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
          /\.html?$/i.test(f)
            ? `<a class="qz-mini" href="../../${esc(f.split("/").map(encodeURIComponent).join("/"))}" target="_blank" rel="noopener noreferrer">${ic("external")} Open</a>`
            : root && editor !== "none"
            ? `<a class="qz-mini" href="${editor}://file${encodeURI(`${root}/${f}`)}">${ic("external")} ${EDITORS[editor]}</a>`
            : "";
        return `<li>${ic("file")}<code>${esc(f)}</code><span class="acts"><button class="qz-mini" data-act="copy" data-path="${esc(f)}">${ic("copy")} Copy</button>${open}</span></li>`;
      })
      .join("");
    return `<div class="qz-files"><h4>${ic("folder")} Open these files first</h4><ul>${rows}</ul></div>`;
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // Runs after every render: grows bars/rings, counts numbers up, and (on a fresh visit) reveals
  // sections as they scroll in.
  function animate(root, opts = {}) {
    const still = reducedMotion();
    const meterEls = [...root.querySelectorAll("[data-meter]")];
    const setMeter = (el, v) => {
      if (el.dataset.meter === "ring") el.style.strokeDashoffset = String(Number(el.dataset.c) * (1 - v / 100));
      else el.style.width = `${v}%`;
    };
    for (const el of meterEls) setMeter(el, still ? Number(el.dataset.value) : meters.get(el.dataset.key) ?? 0);
    if (!still) {
      void root.offsetWidth; // commit the start values so the change below transitions
      requestAnimationFrame(() => meterEls.forEach((el) => setMeter(el, Number(el.dataset.value))));
    }
    for (const el of meterEls) if (el.dataset.key) meters.set(el.dataset.key, Number(el.dataset.value));

    for (const el of root.querySelectorAll("[data-count]")) {
      const to = Number(el.dataset.count);
      const key = el.dataset.key && `n:${el.dataset.key}`;
      const from = key && meters.has(key) ? meters.get(key) : 0;
      if (key) meters.set(key, to);
      if (still || from === to) continue;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 900);
        el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = from;
      requestAnimationFrame(step);
    }

    if (opts.reveal && !still && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            en.target.classList.add("in");
            io.unobserve(en.target);
          }),
        { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
      );
      root.querySelectorAll("[data-reveal]").forEach((el) => {
        el.classList.add("rv");
        io.observe(el);
      });
    }
  }

  function burst(x, y, count = 26, spread = 1) {
    if (reducedMotion()) return;
    const colors = ["#818cf8", "#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f472b6"];
    const layer = document.createElement("div");
    layer.className = "qz-confetti";
    layer.style.left = `${x}px`;
    layer.style.top = `${y}px`;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("i");
      const a = Math.random() * Math.PI * 2;
      const d = (50 + Math.random() * 110) * spread;
      p.style.setProperty("--dx", `${Math.cos(a) * d}px`);
      p.style.setProperty("--dy", `${Math.sin(a) * d - 50 * spread}px`);
      p.style.setProperty("--r", `${Math.random() * 720 - 360}deg`);
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = `${Math.random() * 80}ms`;
      layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 1400);
  }

  function burstFrom(el, count, spread) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, count, spread);
  }

  // ---------- theme ----------

  function applyTheme() {
    const t = state.settings.theme;
    document.documentElement.dataset.theme =
      t === "light" || t === "dark" ? t : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function setTheme(theme) {
    state.settings.theme = theme;
    save();
    const swap = () => {
      applyTheme();
      renderTopbar(parseRoute());
      const select = app.querySelector('[data-setting="theme"]');
      if (select) select.value = theme;
    };
    if (document.startViewTransition && !reducedMotion()) document.startViewTransition(swap);
    else swap();
  }

  // ---------- rendering: top bar ----------

  function renderTopbar(route) {
    const all = stats(allIds());
    const s = streak();
    const reviewing = route.view === "deck" && route.source.key === "review";
    const dark = document.documentElement.dataset.theme !== "light";
    document.getElementById("topbar").innerHTML = `<div class="qz-wrap">
      <a class="qz-brand" href="#/"><span class="qz-logo">${ic("code")}</span><span><small>Why-Not-ReactNative</small><b>React Native Training</b></span></a>
      <nav class="qz-nav-links" aria-label="Primary">
        <a href="#/" class="${route.view === "home" ? "active" : ""}">${ic("home")} Dashboard</a>
        <a href="#/review" class="${reviewing ? "active" : ""}">${ic("repeat")} Review${all.due ? `<span class="count">${all.due}</span>` : ""}</a>
        <a href="../index.html">${ic("book")} Learning path</a>
      </nav>
      <div class="qz-top-right">
        <span class="qz-pill answered" title="Questions answered">${ic("check")} ${all.answered}/${all.total}</span>
        <span class="qz-pill streak ${s ? "hot" : ""}" title="Day streak">${ic("flame")} ${s}</span>
        <button class="qz-icon-btn" data-act="theme" aria-label="Switch to ${dark ? "light" : "dark"} theme" title="Switch to ${dark ? "light" : "dark"} theme">${ic(dark ? "sun" : "moon")}</button>
      </div></div>`;
  }

  // ---------- rendering: dashboard ----------

  let showAllTopics = false;
  const TOPICS_PREVIEW = 12;

  function renderHome(opts = {}) {
    const ids = allIds();
    const all = stats(ids);
    const today = state.days[dayKey(Date.now())] || 0;
    const s = streak();
    const topics = new Map();
    for (const b of banks) for (const q of b.questions) for (const t of q.topics) topics.set(t, [...(topics.get(t) || []), q.id]);
    const topicRows = [...topics.entries()]
      .map(([name, tIds]) => ({ name, ...stats(tIds) }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    const nextBank = banks.find((b) => stats(b.questions.map((q) => q.id)).answered < b.questions.length) || banks[0];
    const primary = state.last
      ? `<a class="qz-btn primary lg" href="${esc(state.last.hash)}">${ic("play")} Resume <em>· Q${state.last.index + 1} of ${state.last.total}</em></a>`
      : `<a class="qz-btn primary lg" href="#/quiz/${nextBank.slug}">${ic("play")} ${all.answered ? "Continue learning" : "Start the course"}</a>`;

    const days = [...Array(14)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return { n: state.days[dayKey(d)] || 0, label: d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) };
    });
    const heat = (n) => (n === 0 ? 0 : n < 5 ? 1 : n < 12 ? 2 : n < 25 ? 3 : 4);
    const fortnight = days.reduce((sum, d) => sum + d.n, 0);

    const lastSlug = state.last && state.last.hash.startsWith("#/quiz/") ? state.last.hash.slice(7) : null;
    const resume = state.last
      ? `<a class="qz-panel qz-cont-card spot" style="${lastSlug ? lookStyle(lastSlug) : ""}" href="${esc(state.last.hash)}">
          ${lastSlug ? tileIcon(lastSlug) : `<span class="qz-tile-icon">${ic(state.last.hash === "#/review" ? "repeat" : "sparkles")}</span>`}
          <div><small>Continue where you left off</small><strong>${esc(state.last.title)}</strong><em>Question ${state.last.index + 1} of ${state.last.total}</em></div>${ic("right")}</a>`
      : "";

    const cards = banks
      .map((b, i) => {
        const s = stats(b.questions.map((q) => q.id));
        const levels = [1, 2, 3].map((l) => b.questions.filter((q) => q.level === l).length);
        const verb = s.answered === 0 ? "Start" : s.answered < s.total ? "Continue" : "Revisit";
        const [statusCls, statusLabel] = s.answered === 0 ? ["", "Not started"] : s.answered < s.total ? ["going", "In progress"] : ["done", "Completed"];
        return `<article class="qz-panel qz-proj spot" style="${lookStyle(b.slug)};--i:${i % 3}" data-reveal>
          <header>${tileIcon(b.slug)}
            <div class="hgroup"><span class="num">MODULE ${esc(b.number)}</span><h3><a href="#/quiz/${b.slug}">${esc(b.title)}</a></h3></div>
            ${ring(s.mastery, { size: 54, stroke: 5, key: `m:${b.slug}`, cls: "tint", label: `<strong>${s.mastery}</strong>` })}
          </header>
          <p>${inline(b.summary)}</p>
          <div class="levels"><span class="l1"><i></i>${levels[0]} beginner</span><span class="l2"><i></i>${levels[1]} intermediate</span><span class="l3"><i></i>${levels[2]} advanced</span></div>
          <div class="qz-proj-progress"><span><strong>${s.answered}</strong> of ${s.total} answered</span><span class="status ${statusCls}">${statusLabel}</span></div>
          ${bar((s.answered / s.total) * 100, "", `mb:${b.slug}`)}
          <div class="qz-proj-stats">
            <span><strong>${s.accuracy}%</strong> correct</span>
            <span><strong>${s.mastered}</strong> mastered</span>
            <span><strong>${s.mastery}%</strong> mastery</span>
            ${s.due ? `<span class="due"><strong>${s.due}</strong> due</span>` : ""}
          </div>
          <footer>
            <a class="qz-btn primary sm" href="#/quiz/${b.slug}">${verb} ${ic("right", "go")}</a>
            ${b.doc ? `<a class="qz-btn ghost sm" href="${esc(b.doc)}">${ic("book")} Write-up</a>` : ""}
            <span class="spacer"></span>
            <button class="qz-btn ghost sm danger" data-act="reset-bank" data-slug="${b.slug}" title="Reset progress for this module" aria-label="Reset progress for ${esc(b.title)}">${ic("trash")}</button>
          </footer>
        </article>`;
      })
      .join("");

    const topicHtml = (showAllTopics ? topicRows : topicRows.slice(0, TOPICS_PREVIEW))
      .map(
        (t) => `<a class="qz-topic ${t.mastery >= 70 ? "m-high" : t.mastery >= 30 ? "m-mid" : ""}" href="#/topic/${encodeURIComponent(t.name)}">
          <span class="name" title="${esc(t.name)}">${esc(t.name)}</span><span class="pct">${t.mastery}%</span>${bar(t.mastery, "slim", `t:${t.name}`)}
          <span class="count"><span>${t.answered}/${t.total} answered</span><span class="go">Drill ${ic("chevron")}</span></span></a>`,
      )
      .join("");

    const features = [
      ["target", "#6366f1", "#22d3ee", "Five question types", "Multiple choice, select-all, put-in-order and find-in-code are graded for you. Explain questions are self-graded against a model answer and rubric."],
      ["repeat", "#a855f7", "#ec4899", "Spaced repetition", "Every question sits in a Leitner box. Right answers come back after 1, 3, 7 then 16 days; a miss drops it to box 1. Box 4+ counts as mastered."],
      ["code", "#10b981", "#0ea5e9", "Read the real code", "Each question names the files to open. Jump straight into VS Code or Cursor, work it out from the source, then read exactly why."],
      ["save", "#f59e0b", "#ef4444", "Auto-saved progress", "Answers, drafts and your position save in this browser as you go. Close the tab any time; export a backup to move browsers."],
    ]
      .map(
        ([icon, c1, c2, title, text], i) => `<div class="qz-panel qz-feature spot" style="--c1:${c1};--c2:${c2};--i:${i}" data-reveal>
          <span class="qz-tile-icon">${ic(icon)}</span><h3>${title}</h3><p>${text}</p></div>`,
      )
      .join("");

    app.innerHTML = `
      <section class="qz-hero">
        <div data-reveal>
          <span class="qz-badge-pill"><b>${banks.length} modules</b> ${ids.length} code-reading questions</span>
          <h1>Learn React Native by reading <span class="grad-text">real production code.</span></h1>
          <p class="lead">Every question points at actual files in this repo: routing, offline sync, payments, background tasks, native modules and OTA releases. Work out the answer from the code, then read exactly why.</p>
          <div class="qz-cta">${primary}<a class="qz-btn lg" href="#/review">${ic("repeat")} ${all.due ? `Review ${all.due} due` : "Review mode"}</a></div>
          <div class="qz-techs"><span>${ic("check")} Expo SDK 57</span><span>${ic("check")} React Native 0.86</span><span>${ic("check")} React 19.2 + Compiler</span><span>${ic("check")} Spaced repetition</span></div>
        </div>
        <div class="qz-panel qz-progress-card" data-reveal style="--i:2">
          <div class="qz-pc-head"><h3>Your progress</h3><span>${today} answered today</span></div>
          <div class="qz-pc-main">
            ${ring(all.mastery, { size: 148, stroke: 12, key: "home:mastery", label: `<strong>${num(all.mastery, "mastery")}%</strong>`, sub: "Mastery" })}
            <div class="qz-pc-stats">
              <div class="qz-stat brand"><strong>${num(all.answered, "answered")}<small>/${all.total}</small></strong><span>${ic("check")} Answered</span></div>
              <div class="qz-stat green"><strong>${num(all.accuracy, "accuracy")}%</strong><span>${ic("target")} Accuracy</span></div>
              <div class="qz-stat purple"><strong>${num(all.mastered, "mastered")}</strong><span>${ic("trophy")} Mastered</span></div>
              <div class="qz-stat orange"><strong>${num(s, "streak")}</strong><span>${ic("flame")} Day streak</span></div>
            </div>
          </div>
          <div class="qz-activity">
            <div class="qz-activity-head"><span>Last 14 days</span><span>${fortnight} answer${fortnight === 1 ? "" : "s"}</span></div>
            <div class="qz-activity-days">${days.map((d, i) => `<i style="--i:${i}" data-l="${heat(d.n)}" class="${i === 13 ? "today" : ""}" title="${esc(d.label)}: ${d.n} answer${d.n === 1 ? "" : "s"}"></i>`).join("")}</div>
          </div>
        </div>
      </section>

      <div class="qz-continue">
        ${resume}
        <a class="qz-panel qz-cont-card spot ${all.due ? "" : "muted"}" style="--c1:#a855f7;--c2:#ec4899" href="#/review">
          <span class="qz-tile-icon">${ic("repeat")}</span>
          <div><small>Spaced repetition</small><strong>${all.due} due for review</strong><em>${all.due ? "Lock in what you've learned" : "Nothing due. Keep answering"}</em></div>${ic("right")}</a>
      </div>

      <section class="qz-section" id="modules">
        <div class="qz-section-head" data-reveal><div><span class="qz-eyebrow">Curriculum</span><h2>Course modules</h2>
          <p>${banks.length} tracks, from the launcher's shared infra to native modules and release pipelines. Each one is a vertical slice of the repo.</p></div></div>
        <div class="qz-grid">${cards}</div>
      </section>

      <section class="qz-section" id="topics">
        <div class="qz-section-head" data-reveal><div><span class="qz-eyebrow">Skills</span><h2>Topic mastery</h2>
          <p>Mastery per topic across every module. Pick a topic to drill only those questions.</p></div></div>
        <div class="qz-topics">${topicHtml}</div>
        ${topicRows.length > TOPICS_PREVIEW ? `<div class="qz-topics-more"><button class="qz-btn ghost" data-act="topics">${showAllTopics ? `Show fewer ${ic("up")}` : `Show all ${topicRows.length} topics ${ic("down")}`}</button></div>` : ""}
      </section>

      <section class="qz-section" id="how">
        <div class="qz-section-head" data-reveal><div><span class="qz-eyebrow">Method</span><h2>How it works</h2>
          <p>Short, code-first questions with spaced review: you build lasting understanding instead of cramming.</p></div></div>
        <div class="qz-features">${features}</div>
        <div class="qz-panel qz-keys" data-reveal>${keysHtml()}</div>
      </section>

      <section class="qz-section" id="settings">
        <div class="qz-section-head" data-reveal><div><span class="qz-eyebrow">Preferences</span><h2>Data &amp; settings</h2>
          <p>Everything stays in this browser. Export a backup before clearing site data or switching machines.</p></div></div>
        <div class="qz-panel qz-settings-card" data-reveal>
          <div class="qz-settings">
            <div class="qz-field">
              <label for="set-editor">Open files in</label>
              <select id="set-editor" data-setting="editor">
                ${Object.entries(EDITORS).map(([k, v]) => `<option value="${k}" ${state.settings.editor === k ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </div>
            <div class="qz-field">
              <label for="set-theme">Theme</label>
              <select id="set-theme" data-setting="theme">
                ${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${state.settings.theme === k ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </div>
            <div class="qz-field grow">
              <label for="set-root">Repo root (for editor links)</label>
              <input id="set-root" data-setting="repoRoot" value="${esc(state.settings.repoRoot)}" placeholder="${esc(repoRoot() || "/absolute/path/to/Why-Not-ReactNative")}" spellcheck="false">
            </div>
          </div>
          <div class="qz-data">
            <button class="qz-btn" data-act="export">${ic("download")} Export progress</button>
            <button class="qz-btn" data-act="import">${ic("upload")} Import progress</button>
            <input type="file" id="import-file" accept="application/json,.json" hidden>
            <span class="spacer"></span>
            <button class="qz-btn ghost danger" data-act="reset-all">${ic("trash")} Reset everything</button>
          </div>
        </div>
      </section>`;

    animate(app, { reveal: opts.focus });
  }

  // ---------- rendering: quiz deck ----------

  function deckLook(src) {
    if (src.key.startsWith("bank:")) return src.key.slice(5);
    return null;
  }

  function renderDeck(opts = {}) {
    const src = session.src;
    const f = filtersFor(src);
    const deck = session.deck;
    const entry = current();
    const topicsInSource = [...new Set(src.ids.flatMap((id) => byId.get(id).q.topics))].sort();
    const slug = deckLook(src);
    const headStyle = slug ? lookStyle(slug) : src.key === "review" ? "--c1:#a855f7;--c2:#ec4899" : "--c1:#6366f1;--c2:#22d3ee";
    const headIcon = slug ? tileIcon(slug) : `<span class="qz-tile-icon">${ic(src.key === "review" ? "repeat" : "sparkles")}</span>`;
    const filtered = f.levels.length || f.topic || (!src.forcedMode && f.mode !== "all");

    const filters = `
      <div class="qz-filters">
        <span class="label">Filter</span>
        ${src.forcedMode ? "" : `<select data-filter="mode" aria-label="Mode">${MODES.map(([k, v]) => `<option value="${k}" ${f.mode === k ? "selected" : ""}>${v}</option>`).join("")}</select>`}
        <div class="qz-chips" role="group" aria-label="Difficulty">
          ${[1, 2, 3].map((l) => `<button class="qz-chip lvl-${l} ${f.levels.includes(l) ? "on" : ""}" data-act="level" data-level="${l}" aria-pressed="${f.levels.includes(l)}"><i></i>${LEVEL_LABEL[l]}</button>`).join("")}
        </div>
        ${src.topicLocked ? "" : `<select data-filter="topic" aria-label="Topic"><option value="">All topics</option>${topicsInSource.map((t) => `<option ${f.topic === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`}
        ${filtered ? `<button class="qz-btn ghost sm" data-act="clear-filters">${ic("x")} Clear</button>` : ""}
      </div>`;

    const tally = { correct: 0, partial: 0, wrong: 0, new: 0 };
    const dots = deck
      .map((id, i) => {
        const r = session.results[id] || (state.q[id] && { result: state.q[id].last });
        tally[r ? r.result : "new"] = (tally[r ? r.result : "new"] || 0) + 1;
        return `<button class="qz-dot ${r ? r.result : ""} ${i === session.index ? "cur" : ""}" data-act="jump" data-i="${i}" title="Question ${i + 1}" aria-label="Question ${i + 1}${r ? `, ${RESULT_LABEL[r.result] || ""}` : ""}">${i + 1}</button>`;
      })
      .join("");

    let main;
    if (!deck.length) {
      main = `<div class="qz-panel qz-empty"><span class="qz-tile-icon">${ic(f.mode === "due" ? "clock" : "search")}</span><h3>Nothing here</h3><p>No questions match these filters${f.mode === "due" ? ". Nothing is due for review right now" : ""}.</p>
        <div class="qz-data">${src.forcedMode ? `<a class="qz-btn primary" href="#/">${ic("home")} Back to dashboard</a>` : `<button class="qz-btn primary" data-act="clear-filters">Show all questions</button>`}</div></div>`;
    } else if (!entry) {
      main = finishHtml();
    } else {
      const enter = opts.focus ? `enter-${opts.dir || "fwd"}` : "";
      main = `<article class="qz-panel qz-card ${enter}" id="qz-card" style="${lookStyle(entry.bank.slug)}">${cardHtml(entry.q, entry.bank)}</article>`;
    }

    const answered = stats(deck).answered;
    const aside = deck.length
      ? `<aside class="qz-aside">
          <div class="qz-panel">
            <h4>Deck progress</h4>
            <div class="qz-aside-ring">
              ${ring(deck.length ? (answered / deck.length) * 100 : 0, { size: 92, stroke: 8, key: `deck:${src.key}`, label: `<strong>${answered}</strong>`, sub: `of ${deck.length}` })}
              <ul>
                <li><span><i style="background:var(--green)"></i>Correct</span><b>${tally.correct}</b></li>
                <li><span><i style="background:var(--amber)"></i>Partial</span><b>${tally.partial}</b></li>
                <li><span><i style="background:var(--red)"></i>Missed</span><b>${tally.wrong}</b></li>
                <li><span><i style="background:var(--surface-3);border:1px solid var(--border-strong)"></i>New</span><b>${tally.new}</b></li>
              </ul>
            </div>
          </div>
          <div class="qz-panel">
            <h4>Questions</h4>
            <div class="qz-dots">${dots}</div>
          </div>
          <div class="qz-panel keys-panel"><h4>Shortcuts</h4><div class="qz-keys">${keysHtml()}</div></div>
        </aside>`
      : "";

    const crumb = slug ? `Module ${esc(src.number)}` : src.key === "review" ? "Review" : "Topic";
    app.innerHTML = `
      <nav class="qz-crumbs"><a href="#/">${ic("home")} Dashboard</a><span class="sep">/</span><span>${crumb}</span>${src.doc ? `<span class="sep">·</span><a href="${esc(src.doc)}">${ic("book")} Read the write-up</a>` : ""}</nav>
      <div class="qz-deck-head" style="${headStyle}">${headIcon}<div><span class="num">${esc(src.eyebrow)}</span><h1>${esc(src.heading)}</h1><p>${inline(src.summary)}</p></div></div>
      ${filters}
      <div class="qz-deck">
        <div class="qz-main">
          ${deck.length ? `<div class="qz-progress"><div class="qz-progress-head"><span>${entry ? `Question <strong>${session.index + 1}</strong> of ${deck.length}` : `Finished ${deck.length} questions`}</span><span class="qz-dim">${answered}/${deck.length} answered</span></div>${bar(((entry ? session.index + 1 : deck.length) / deck.length) * 100, "slim", `pos:${src.key}`)}</div>` : ""}
          ${main}
          ${entry ? `<div class="qz-nav"><button class="qz-btn" data-act="prev" ${session.index === 0 ? "disabled" : ""}>${ic("left", "back")} Previous</button><span class="qz-dim">Use <kbd>←</kbd> <kbd>→</kbd> to move</span><button class="qz-btn" data-act="next">${session.index === deck.length - 1 ? "Finish" : "Next"} ${ic("right", "go")}</button></div>` : ""}
        </div>
        ${aside}
      </div>`;

    session.pop = null;
    animate(app);
    if (opts.focus && entry) app.querySelector(".qz-text, .qz-essay:not([readonly])")?.focus({ preventScroll: true });
    if (opts.feedback) {
      const card = document.getElementById("qz-card");
      card?.classList.add(`fb-${opts.feedback}`);
      if (opts.feedback === "correct") burstFrom(app.querySelector(".qz-result .badge"), 28, 1);
    }
    if (!entry && deck.length && opts.focus) {
      const results = Object.values(session.results);
      const good = results.filter((r) => r.result === "correct").length;
      if (results.length && good / results.length >= 0.6) setTimeout(() => burstFrom(app.querySelector(".qz-finish .qz-tile-icon"), 60, 1.8), 250);
    }
  }

  function finishHtml() {
    const results = Object.values(session.results);
    const count = (r) => results.filter((x) => x.result === r).length;
    const missed = session.deck.filter((id) => state.q[id] && state.q[id].last !== "correct").length;
    return `<div class="qz-panel qz-empty qz-finish">
      <span class="qz-tile-icon" style="--c1:#f59e0b;--c2:#ec4899">${ic("trophy")}</span>
      <h3>Deck complete</h3>
      <p>Here is how this visit went.</p>
      <div class="qz-finish-stats">
        <div><strong class="ok">${count("correct")}</strong><span>Correct</span></div>
        <div><strong class="part">${count("partial")}</strong><span>Partial</span></div>
        <div><strong class="bad">${count("wrong")}</strong><span>Missed</span></div>
      </div>
      <p class="qz-dim">${missed ? `${missed} question${missed > 1 ? "s" : ""} in this deck still need work.` : "Every question in this deck is currently correct."}</p>
      <div class="qz-data">
        <button class="qz-btn" data-act="jump" data-i="0">${ic("repeat")} Start over</button>
        ${missed && !session.src.forcedMode ? `<button class="qz-btn primary" data-act="set-mode" data-mode="missed">${ic("target")} Practise missed</button>` : ""}
        <a class="qz-btn ghost" href="#/">${ic("home")} Dashboard</a>
      </div></div>`;
  }

  const RESULT_ICON = { correct: "check", partial: "minus", wrong: "x" };
  const RESULT_SUB = {
    correct: "You nailed it.",
    partial: "Almost there. The explanation fills the gap.",
    wrong: "Read why below. It comes back for review right away.",
  };

  function cardHtml(q, bank) {
    const ph = phase(q);
    const res = ph === "done" ? shownResult(q) : null;
    const r = state.q[q.id];
    const status = r ? `<span class="qz-badge box">${ic("clock")} Box ${r.box} · ${dueLabel(r)}</span>` : `<span class="qz-badge box new">${ic("sparkles")} New</span>`;
    const showBank = !session.src.key.startsWith("bank:");
    return `
      <div class="qz-meta">
        <span class="qz-qnum">Q${session.index + 1}</span>
        <span class="qz-badge type">${ic(TYPE_ICON[q.type])} ${TYPE_LABEL[q.type]}</span>
        <span class="qz-badge lvl-${q.level}">${LEVEL_LABEL[q.level]}</span>
        ${showBank ? `<a class="qz-badge" href="#/quiz/${bank.slug}">${esc(bank.number)} · ${esc(bank.title)}</a>` : ""}
        ${q.topics.map((t) => `<a class="qz-badge topic" href="#/topic/${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}
        ${status}
      </div>
      <div class="qz-prompt">${md(q.prompt)}</div>
      ${q.code ? `<pre class="qz-code"><code>${esc(q.code)}</code></pre>` : ""}
      ${filesHtml(q.files)}
      ${q.hint && ph !== "done" ? (session.hints.has(q.id) ? `<div class="qz-hint">${ic("bulb")}<div>${md(q.hint)}</div></div>` : `<button class="qz-link" data-act="hint">${ic("bulb")} Show hint <kbd>H</kbd></button>`) : ""}
      <div class="qz-body">${bodyHtml(q, ph, res)}</div>
      ${res ? `<div class="qz-result ${res.result}"><span class="badge">${ic(RESULT_ICON[res.result] || "x")}</span><div>${RESULT_LABEL[res.result] || ""}<small>${RESULT_SUB[res.result] || ""}</small></div></div><div class="qz-explain"><h4>${ic("bulb")} Why</h4>${md(q.explain)}${linksHtml(q.links)}</div>` : ""}
      <div class="qz-actions">${actionsHtml(q, ph, res)}</div>`;
  }

  // Official documentation for the question, shown with the explanation.
  function linksHtml(links) {
    if (!Array.isArray(links) || !links.length) return "";
    const items = links
      .filter((l) => l && /^https:\/\//.test(l.url))
      .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${ic("external")} ${esc(l.title)}</a></li>`)
      .join("");
    return items ? `<div class="qz-docs"><h4>${ic("book")} Official docs</h4><ul>${items}</ul></div>` : "";
  }

  const words = (s) => (String(s).trim().match(/\S+/g) || []).length;

  function bodyHtml(q, ph, res) {
    const done = ph === "done";
    const ans = done ? res.answer : draft(q);
    switch (q.type) {
      case "mcq":
      case "multi": {
        const multi = q.type === "multi";
        const want = new Set(multi ? q.answer : [q.answer]);
        const picked = new Set(multi ? ans || [] : ans === null || ans === undefined ? [] : [ans]);
        return `${multi && !done ? `<p class="qz-dim">Select every option that applies.</p>` : ""}<div class="qz-choices ${multi ? "multi" : ""}">${perm(q.id, q.choices.length)
          .map((ci, k) => {
            let cls = picked.has(ci) ? "selected" : "";
            let tag = "";
            if (done) {
              if (want.has(ci) && picked.has(ci)) [cls, tag] = ["right", ic("check")];
              else if (want.has(ci)) [cls, tag] = [multi ? "missed" : "right", multi ? `${ic("minus")} missed` : ic("check")];
              else if (picked.has(ci)) [cls, tag] = ["wrong", ic("x")];
              else cls = "dim";
            }
            if (session.pop === `c:${ci}`) cls += " pop";
            const key = multi ? ic(cls.startsWith("wrong") ? "x" : "check") : k + 1;
            return `<button class="qz-choice ${cls}" style="--k:${k}" data-act="${multi ? "toggle" : "pick"}" data-i="${ci}" ${done ? "disabled" : ""} aria-pressed="${picked.has(ci)}">
              <span class="key">${key}</span><span class="txt">${inline(q.choices[ci])}</span>${tag ? `<span class="tag">${tag}</span>` : ""}</button>`;
          })
          .join("")}</div>`;
      }
      case "order": {
        const rows = (ans || [])
          .map((ii, pos) => {
            let cls = done ? (ii === pos ? "right" : "wrong") : "";
            if (session.pop === `r:${pos}`) cls += " pop";
            const controls = done
              ? ""
              : `<span class="btns"><button data-act="up" data-pos="${pos}" ${pos === 0 ? "disabled" : ""} aria-label="Move up">${ic("up")}</button><button data-act="down" data-pos="${pos}" ${pos === ans.length - 1 ? "disabled" : ""} aria-label="Move down">${ic("down")}</button></span>`;
            return `<li class="qz-order-row ${cls}" style="--k:${pos}" ${done ? "" : `draggable="true"`} data-pos="${pos}"><span class="grip">${ic(done ? (ii === pos ? "check" : "x") : "grip")}</span><span class="num">${pos + 1}</span><span class="txt">${inline(q.items[ii])}</span>${controls}</li>`;
          })
          .join("");
        const correct = done && res.result !== "correct"
          ? `<h4>Correct order</h4><ol class="qz-correct-order">${q.items.map((t) => `<li>${inline(t)}</li>`).join("")}</ol>`
          : "";
        return `${done ? "<h4>Your order</h4>" : `<p class="qz-dim">Drag rows into place, or use the arrows.</p>`}<ol class="qz-order">${rows}</ol>${correct}`;
      }
      case "text": {
        if (!done) return `<div class="qz-input-wrap">${ic("search")}<input class="qz-text" value="${esc(ans)}" placeholder="Type your answer, then press Enter" autocomplete="off" autocapitalize="off" spellcheck="false"></div>`;
        const accepted = q.accept.map((a) => (a instanceof RegExp ? `<code>${esc(String(a))}</code>` : `<code>${esc(a)}</code>`)).join(" ");
        return `<div class="qz-yours ${res.result}"><span>Your answer</span><code>${esc(res.answer || "—")}</code></div><p class="qz-accepted"><span>Accepted:</span> ${accepted}</p>`;
      }
      case "explain": {
        if (ph === "answer") {
          const n = words(ans);
          return `<textarea class="qz-essay" rows="7" placeholder="Explain in your own words. ⌘/Ctrl+Enter reveals the model answer.">${esc(ans)}</textarea><div class="qz-counter" data-words>${n} word${n === 1 ? "" : "s"}</div>`;
        }
        const checked = session.rubric[q.id] || new Set();
        const rubric = q.rubric
          .map((p, i) =>
            done
              ? `<li>${inline(p)}</li>`
              : `<li><label><input type="checkbox" data-rubric="${i}" ${checked.has(i) ? "checked" : ""}> <span>${inline(p)}</span></label></li>`,
          )
          .join("");
        return `<h4>Your answer</h4><div class="qz-essay-read">${esc(ans || "(left blank)")}</div>
          <h4>Model answer</h4><div class="qz-model">${md(q.model)}</div>
          <h4>${done ? "Rubric" : "Tick each point your answer covered"}</h4><ul class="qz-rubric ${done ? "read" : ""}">${rubric}</ul>`;
      }
      default:
        return "";
    }
  }

  function actionsHtml(q, ph, res) {
    const nextLabel = session.index === session.deck.length - 1 ? "Finish" : "Next";
    if (ph === "answer") {
      const label = q.type === "explain" ? `${ic("sparkles")} Reveal model answer` : `${ic("check")} Submit`;
      return `<button class="qz-btn primary" data-act="submit">${label}</button><span class="spacer"></span><button class="qz-btn ghost" data-act="next">Skip ${ic("right", "go")}</button>`;
    }
    if (ph === "reveal") {
      const ticked = (session.rubric[q.id] || new Set()).size;
      const ratio = ticked / q.rubric.length;
      const suggest = ratio >= 0.8 ? "correct" : ratio >= 0.4 ? "partial" : "wrong";
      return `<span class="qz-dim">How did you do? (${ticked}/${q.rubric.length} points)</span>
        ${["correct", "partial", "wrong"]
          .map((g) => `<button class="qz-btn grade-${g} ${g === suggest ? "suggested" : ""}" data-act="grade" data-grade="${g}">${ic(RESULT_ICON[g])} ${{ correct: "Got it", partial: "Partly", wrong: "Missed it" }[g]}</button>`)
          .join("")}`;
    }
    const override = q.type === "text" && res && res.result === "wrong" && session.results[q.id]
      ? `<button class="qz-btn ghost" data-act="override" title="Use when your answer is right but phrased differently">${ic("check")} I was right, count it</button>`
      : "";
    return `<button class="qz-btn ghost" data-act="retry">${ic("repeat")} Retry</button>${override}<span class="spacer"></span><button class="qz-btn primary" data-act="next">${nextLabel} ${ic("right", "go")}</button>`;
  }

  function render(opts = {}) {
    const route = parseRoute();
    if (route.view === "deck") {
      openSession(route.source);
      renderDeck(opts);
    } else {
      session = null;
      renderHome(opts);
    }
    renderTopbar(route);
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
    renderDeck({ feedback: result });
    renderTopbar(parseRoute());
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
    session.pop = `r:${to}`;
    renderDeck();
  }

  const actions = {
    pick(el) {
      setDraft(current().q, Number(el.dataset.i));
      session.pop = `c:${el.dataset.i}`;
      renderDeck();
    },
    toggle(el) {
      const { q } = current();
      const i = Number(el.dataset.i);
      const d = draft(q);
      setDraft(q, d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort((a, b) => a - b));
      session.pop = `c:${i}`;
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
    theme: () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"),
    topics() {
      showAllTopics = !showAllTopics;
      renderHome();
    },
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
      render();
    },
    "reset-all"() {
      if (!confirm("Erase ALL quiz progress in this browser? Export first if you want a backup.")) return;
      state = { ...freshState(), settings: state.settings };
      meters.clear();
      save();
      render();
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
    const onClick = (e) => {
      const el = e.target.closest("[data-act]");
      if (el && actions[el.dataset.act]) {
        e.preventDefault();
        actions[el.dataset.act](el);
      }
    };
    app.addEventListener("click", onClick);
    document.getElementById("topbar").addEventListener("click", onClick);

    app.addEventListener("input", (e) => {
      const t = e.target;
      if (t.matches(".qz-text, .qz-essay")) {
        setDraft(current().q, t.value, true);
        const counter = t.matches(".qz-essay") && app.querySelector("[data-words]");
        if (counter) {
          const n = words(t.value);
          counter.textContent = `${n} word${n === 1 ? "" : "s"}`;
        }
      }
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
      } else if (t.dataset.setting === "theme") setTheme(t.value); else if (t.id === "import-file" && t.files[0]) importFile(t.files[0]);
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
        session.pop = `c:${ci}`;
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

    // Cursor-following glow on .spot cards.
    document.addEventListener("pointermove", (e) => {
      const card = e.target.closest && e.target.closest(".spot");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });

    // Reading-progress line and the top bar's shadow once the page scrolls.
    const line = document.getElementById("scroll-progress");
    const topbar = document.getElementById("topbar");
    let ticking = false;
    const onScroll = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      line.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
      topbar.classList.toggle("scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", () => {
      if (!ticking) requestAnimationFrame(onScroll);
      ticking = true;
    }, { passive: true });
    onScroll();

    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
      if (state.settings.theme !== "system") return;
      applyTheme();
      renderTopbar(parseRoute());
    });
  }

  function start() {
    app = document.getElementById("app");
    for (const bank of banks) for (const q of bank.questions) byId.set(q.id, { q, bank });
    banks.sort((a, b) => a.number.localeCompare(b.number));
    state = loadState();
    applyTheme();
    bindEvents();
    render({ focus: true });
  }
})();
