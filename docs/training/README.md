# React Native Training quizzes

Code-reading quizzes for every project in this repo. Open `docs/training/index.html` in a
browser (double-click works, no server needed). Each question names the files to open; you work
out the answer from the real code, then the explanation tells you why.

- **Banks:** `banks/00-launcher.js` … `banks/06-tic-tac-toe.js`, one per project.
- **Progress** is saved in `localStorage` (`wnrn-training-v1`) on every answer and while you
  type. The dashboard has **Export / Import** for backups or moving browsers.
- **Spaced repetition:** Leitner boxes 1–5, due again after 0 / 1 / 3 / 7 / 16 days. A miss
  drops a question to box 1. "Mastered" means box 4 or higher.
- **Look:** `quiz.css` is a standalone design system (it no longer loads `../assets/style.css`):
  dark and light themes (top-bar toggle, or "Match system" in settings), per-module colours and
  icons from `LOOKS` in `quiz.js`, and motion that respects `prefers-reduced-motion`. No external
  fonts or libraries, so `file://` still works offline.
- **Editor links:** when the page is opened from disk, "Open in VS Code" links point at the repo
  automatically. When it's served over http, set the repo root on the dashboard.

## Checking the banks

```bash
node docs/training/validate.mjs
```

This checks shape, unique ids, per-type fields and answer indices. It also confirms that **every
path in `files` still exists** and that `index.html` loads every bank. Run it after moving code
around: a question that points at a deleted file fails here.

## Question format

Each bank is plain browser JS (not a module), so it loads over `file://`:

```js
QUIZ.register({
  slug: "store", number: "03", title: "Production commerce app",
  doc: "../03-commerce-platform.html", summary: "…",
  questions: [
    {
      id: "store-07",                       // unique across all banks
      type: "mcq",                          // mcq | multi | order | text | explain
      level: 2,                             // 1 beginner · 2 intermediate · 3 advanced
      topics: ["TanStack Query"],           // reuse existing names so topic mastery aggregates
      files: ["src/projects/store/api/refreshCoordinator.ts"], // must exist
      prompt: "…",                          // `code`, **bold**, blank line, "- " bullets
      code: "optional snippet",
      hint: "optional",
      explain: "shown after answering",
      // per type:
      choices: ["…"], answer: 2,            // mcq (answer = index)
      // choices + answer: [0, 3]           // multi (all correct indices)
      // items: ["first", "second", …]      // order (write them in the CORRECT order)
      // accept: ["name.ts", /regex/i]      // text (case-insensitive, basename and extension tolerant)
      // model: "…", rubric: ["…", "…"]     // explain (self-graded)
    },
  ],
});
```

The engine shuffles choices and order items deterministically per question id, so the answer
position in the file doesn't matter. To add a bank, create the file and add its `<script>` tag to
`index.html`.
