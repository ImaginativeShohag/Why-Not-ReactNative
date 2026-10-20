QUIZ.register({
  slug: "offline-journal",
  number: "01",
  title: "Offline-first journal",
  doc: "../01-offline-journal.html",
  summary:
    "Trains the offline-first core of Project 01: expo-sqlite with WAL and user_version migrations, FTS5 search kept in sync by triggers, a transactional outbox with compaction, backoff and conflict rules, headless background sync, the biometric lock, reminder routing, and the React patterns that hold it together.",
  questions: [
    // ---------------------------------------------------------------------
    // Level 1: foundations
    // ---------------------------------------------------------------------
    {
      id: "offline-journal-01",
      type: "mcq",
      level: 1,
      topics: ["SQLite", "Architecture"],
      files: [
        "src/app/projects/offline-journal/_layout.tsx",
        "src/projects/offline-journal/hooks/useEntries.ts",
        "src/projects/offline-journal/db/client.ts",
      ],
      prompt:
        "Open `src/app/projects/offline-journal/_layout.tsx` and `src/projects/offline-journal/hooks/useEntries.ts` (and grep for `openDatabase` and `getDb` across `src/` to see who is allowed to call what). How do the journal's screens and hooks get their database handle?",
      choices: [
        "From `useSQLiteContext()`, which returns the handle opened by `<SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase} useSuspense>` in the project layout",
        "Each hook calls `openDatabaseAsync(\"journal.db\")` itself and caches the handle in a `useRef`",
        "From a TanStack Query `useQuery` whose `queryFn` returns the database from `src/shared/providers/QueryProvider.tsx`",
        "From `getDb()` in `db/client.ts`, which every screen awaits inside a `useEffect`",
      ],
      answer: 0,
      explain:
        "The journal owns exactly one database provider, and it sits in the **project** layout, not the root. `SQLiteProvider` runs `initDatabase` (migrate, then seed) before any child renders, so every screen and hook that calls `useSQLiteContext()` is guaranteed a migrated database. `getDb()` exists only for callers with no React tree: the sync engine and the headless background task.\n\n- **Failure mode if done differently:** a hook that opens its own handle bypasses Suspense, the error boundary and the migration guarantee, so a screen can query tables that do not exist yet.\n- **Restructuring decision:** the launcher must not open the journal's database or prompt for Face ID, which is why the provider and the `LockGate` live in the journal's layout.\n- The journal does not use TanStack Query at all; reads come from its own `useLiveQuery`.\n\nIn the tutorial: *Architecture → Provider stack*, then *M1 Skeleton & database*.",
      links: [{ title: "expo-sqlite reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" }, { title: "React: Suspense", url: "https://react.dev/reference/react/Suspense" }],
    },
    {
      id: "offline-journal-02",
      type: "text",
      level: 1,
      topics: ["SQLite"],
      files: ["src/projects/offline-journal/db/migrations.ts"],
      prompt:
        "Open `src/projects/offline-journal/db/migrations.ts` and read `migrate()` (or look up `user_version` in the SQLite PRAGMA docs). It reads a number that SQLite keeps in the database file header, compares it to `SCHEMA_VERSION`, and bumps it after each step. Type the PRAGMA name (you can leave out the word PRAGMA).",
      accept: ["user_version", /^(pragma\s+)?user_version(\s*;)?$/i],
      explain:
        "`PRAGMA user_version` is a free 32-bit integer in the SQLite file header, which makes it the cheapest possible schema version: no extra table, and it travels with the file. `migrate()` reads it, then for each missing step runs `MIGRATIONS[next]` and writes `PRAGMA user_version = ${next}` **in the same transaction**.\n\n- **Why the bump rides inside the transaction:** a crash mid-upgrade then leaves a version number that matches the schema that actually exists. Bump it outside and a crash re-runs a step that already succeeded (`CREATE TABLE … already exists`).\n- **Why it is interpolated:** PRAGMA statements cannot take bound parameters. That is safe only because `next` is an integer computed in code.\n- An ORM would hide this gate from you, which is exactly why the tutorial has you write it by hand.\n\nIn the tutorial: *Data model & flow → Tables* (the `migrate` listing and the \"Four details that bite\" warning).",
      links: [{ title: "SQLite PRAGMA reference (user_version, journal_mode, foreign_keys)", url: "https://www.sqlite.org/pragma.html" }, { title: "expo-sqlite reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" }],
    },
    {
      id: "offline-journal-03",
      type: "mcq",
      level: 1,
      topics: ["Offline & Sync", "SQLite"],
      files: [
        "src/projects/offline-journal/utils/id.ts",
        "src/projects/offline-journal/sync/syncEngine.ts",
      ],
      prompt:
        "Entry ids are 26-character ULIDs generated on the device (`utils/id.ts`), not server ids or autoincrement integers. Check `utils/id.ts`, then grep `syncEngine.ts` for `idempotency-key` and `remote_id`. Which reason matches how the code actually uses them?",
      choices: [
        "They can be created offline with no server round-trip, they sort by creation time, and they serve as the idempotency key for `PUT /entries/:id`",
        "The server assigns the real id on the first sync. The ULID is a placeholder that `remote_id` later replaces",
        "FTS5 external-content tables need a TEXT primary key, so INTEGER ids would break search",
        "SQLite does not allow random UUIDv4 strings as primary keys",
      ],
      answer: 0,
      explain:
        "The ULID solves three problems with one value. It can be minted **offline** by any device with no coordination (80 random bits), it sorts by creation time (10 timestamp characters), and it is the **idempotency key**: `PUT /entries/:id` is an upsert on it, so replaying a request whose response was lost is a no-op. `markDone` even sets `remote_id = COALESCE(remote_id, id)`, so the server never assigns a different id.\n\n- **Failure mode with server-assigned ids:** the client cannot reference a row until a round-trip finishes, so offline creation, tags, attachments and outbox items would all need an id-rewrite step.\n- FTS5 external content is keyed on the implicit `rowid`, not the TEXT primary key, so that distractor is wrong. The timeline orders by `created_at`, not by id.\n\nIn the tutorial: *M1* (`utils/id.ts`) and *Data model & flow → Sync semantics to decide*.",
      links: [{ title: "ULID specification", url: "https://github.com/ulid/spec" }, { title: "MDN: idempotent", url: "https://developer.mozilla.org/en-US/docs/Glossary/Idempotent" }, { title: "SQLite rowid tables", url: "https://www.sqlite.org/rowidtable.html" }],
    },
    {
      id: "offline-journal-04",
      type: "text",
      level: 1,
      topics: ["Offline & Sync", "SQLite"],
      files: [
        "src/projects/offline-journal/db/migrations.ts",
        "src/projects/offline-journal/db/queries/entries.ts",
      ],
      prompt:
        "Open `db/queries/entries.ts`, read `softDeleteEntry()`, and grep `migrations.ts` for the column that its UPDATE sets. Deleting an entry never runs `DELETE FROM entries`. Type the column that marks a row as deleted.",
      accept: ["deleted_at", "entries.deleted_at"],
      explain:
        "A hard delete would erase the only evidence that the entry ever existed, so the server could never be told. `softDeleteEntry()` sets `deleted_at` and enqueues a `delete` op in one transaction; the row stays so the delete can be replayed (and the pull's tombstone can arrive from other devices).\n\n- **Failure mode:** with `DELETE FROM entries`, a delete made offline vanishes locally, nothing is queued, and the entry reappears on the next pull.\n- Every read filters `deleted_at IS NULL`, and the partial index `idx_entries_timeline … WHERE deleted_at IS NULL` keeps tombstones out of the timeline index.\n- Rows are hard-deleted later by `purgeDeleted()`, and only once `dirty = 0` and nothing is queued for them.\n\nIn the tutorial: *Data model & flow → Write path* (the \"Soft delete\" listing) and the `entries` row in the tables.",
      links: [{ title: "SQLite partial indexes", url: "https://www.sqlite.org/partialindex.html" }, { title: "SQLite ALTER TABLE", url: "https://www.sqlite.org/lang_altertable.html" }],
    },
    {
      id: "offline-journal-05",
      type: "mcq",
      level: 1,
      topics: ["SQLite", "React Hooks"],
      files: [
        "src/projects/offline-journal/hooks/useLiveQuery.ts",
        "src/projects/offline-journal/db/client.ts",
        "src/app/projects/offline-journal/_layout.tsx",
      ],
      prompt:
        "`useLiveQuery` re-runs its query when expo-sqlite's `addDatabaseChangeListener` reports a change to one of the watched tables. Check the options passed in `_layout.tsx` and `db/client.ts`, and the expo-sqlite docs for `addDatabaseChangeListener`. What has to be true for those events to fire at all?",
      choices: [
        "The database must be opened with `enableChangeListener: true`. Both `SQLiteProvider`'s `options` and `getDb()` pass it",
        "Every write must go through `withTransactionAsync`, because plain `runAsync` writes emit no events",
        "Each table needs a trigger that inserts into a change-log table",
        "The database must be in WAL mode, which `migrate()` turns on",
      ],
      answer: 0,
      explain:
        "Change events are **opt-in per connection**: `enableChangeListener: true` must be passed when the database is opened. That is the whole mechanism behind `useLiveQuery`, which replaces manual refetching: any write, from a screen or from the sync engine, wakes the queries that watch the touched table.\n\n- **Why the options must match:** `SQLiteProvider` and `getDb()` share one native connection only when name and options are identical. Pass the flag to one and not the other and live queries silently stop updating after sync writes.\n- Events are per changed row (hence the 50 ms coalescing timer in the hook), and fire for plain `runAsync` as well as transactions. WAL is unrelated; it concerns readers and writers, not notifications.\n\nIn the tutorial: *Data model & flow → Read path* and the \"Two ways in, one connection\" note in *M1*.",
      links: [{ title: "expo-sqlite reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" }, { title: "SQLite write-ahead logging", url: "https://www.sqlite.org/wal.html" }],
    },
    {
      id: "offline-journal-06",
      type: "text",
      level: 1,
      topics: ["Gesture Handler", "Reanimated"],
      files: ["src/projects/offline-journal/components/SwipeToDelete.tsx"],
      prompt:
        "Open `components/SwipeToDelete.tsx`. The Delete button is rendered with `renderRightActions`, and a full swipe commits the delete from `onSwipeableOpen(direction)`. Which `SwipeDirection` member triggers the delete? Confirm in the Gesture Handler docs how \"direction\" is defined. Type `LEFT` or `RIGHT`.",
      accept: ["LEFT", "SwipeDirection.LEFT"],
      hint: "Which way does the row itself move when the right-hand actions are revealed?",
      explain:
        "`ReanimatedSwipeable` reports the direction the **row** moved, not the side where the actions sit. Revealing right-hand actions slides the row left, so the committing swipe is `SwipeDirection.LEFT`. An earlier draft of the tutorial assumed the opposite (`\"right\"`), so the swipe never committed the delete.\n\n- **Lesson for building:** verify a library's own definition of \"direction\" in its docs, then test the gesture on a device.\n- The component also guards against a double commit with `committedRef`, and closes the swipeable after committing because FlashList recycles cells.\n\nIn the tutorial: *M2 CRUD + timeline* (the swipe paragraph under `useDeleteWithUndo`).",
      links: [{ title: "Gesture Handler: ReanimatedSwipeable", url: "https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/" }],
    },
    {
      id: "offline-journal-07",
      type: "mcq",
      level: 1,
      topics: ["Zustand", "Expo Router"],
      files: [
        "src/app/projects/offline-journal/(tab)/index.tsx",
        "src/projects/offline-journal/stores/settingsStore.ts",
      ],
      prompt:
        "The timeline redirects to onboarding with `if (hydrated && !onboarded) return <Redirect … />`. Trace `useSettingsHydrated` in `settingsStore.ts`. What would an already-onboarded user see if the `hydrated &&` check were removed?",
      choices: [
        "A redirect to onboarding on every cold start. The store starts from its defaults (`onboarded: false`) until AsyncStorage finishes loading",
        "Nothing changes, because Zustand's `persist` reads AsyncStorage synchronously before the first render",
        "A crash, because `onboarded` is `undefined` until hydration",
        "Onboarding would never appear, even on a fresh install",
      ],
      answer: 0,
      explain:
        "AsyncStorage is asynchronous, so the first render of a persisted Zustand store sees the initial state from `create()`, where `onboarded` is `false`. Without the `hydrated &&` guard, `<Redirect>` fires before the saved value loads and an already-onboarded user is thrown back into onboarding on every cold start.\n\n- **Design decision:** anything that depends on persisted values (onboarding redirect, app lock) is gated on `useSettingsHydrated()`.\n- **Failure mode:** a flash of the wrong screen, or worse for the lock: content shown (or hidden) before the real setting is known. `useAppLock` treats \"not hydrated\" as locked.\n\nIn the tutorial: *M7 Lock, export, polish* (onboarding bullet) and the \"Hydration flash\" failure mode.",
      links: [{ title: "Zustand: persisting store data", url: "https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data.html" }],
    },
    {
      id: "offline-journal-08",
      type: "mcq",
      level: 1,
      topics: ["FlashList", "Performance"],
      files: [
        "src/app/projects/offline-journal/(tab)/index.tsx",
        "src/projects/offline-journal/utils/timeline.ts",
        "src/projects/offline-journal/__tests__/timeline.test.ts",
      ],
      prompt:
        "Read `toRows()` and the FlashList props in `(tab)/index.tsx`, and the FlashList docs for `getItemType`. Why does `toRows()` in `utils/timeline.ts` build one flat array of `header` and `entry` rows, and why does the timeline pass `getItemType={(row) => row.kind}` to FlashList?",
      choices: [
        "FlashList takes one flat `data` array (no SectionList-style sections). `getItemType` makes header cells recycle with header cells and entry cells with entry cells, and `headerIndices()` supplies `stickyHeaderIndices`",
        "FlashList needs every item to be the same height, so headers are added as fake entries to fill the gaps",
        "`getItemType` sets the accessibility role of each row",
        "Flattening lets SQLite return headers and entries together from a single UNION query",
      ],
      answer: 0,
      explain:
        "FlashList takes a single flat `data` array, so day grouping is done in JS by the pure function `toRows()` (testable without a renderer). `getItemType` gives headers and entry cards separate recycle pools, so a short header cell is never reused as a tall card and vice versa. `headerIndices()` feeds `stickyHeaderIndices`.\n\n- **Failure mode:** one pool for two very different shapes means constant re-layout and visible jank on a fast scroll through hundreds of rows.\n- Recycling also depends on stable, unique keys, which `timeline.test.ts` asserts. `onEndReached` grows `limit` only when the last page came back full, so 5,000 entries never load at once.\n\nIn the tutorial: *M2*, the `timeline.ts` listing, and its 500-entry scroll checkpoint.",
      links: [{ title: "FlashList usage", url: "https://shopify.github.io/flash-list/docs/usage" }, { title: "React: memo", url: "https://react.dev/reference/react/memo" }],
    },
    {
      id: "offline-journal-09",
      type: "text",
      level: 1,
      topics: ["SQLite"],
      files: [
        "src/projects/offline-journal/db/migrations.ts",
        "src/projects/offline-journal/db/queries/search.ts",
      ],
      prompt:
        "Open `db/migrations.ts` (the V2 block; the SQLite FTS5 docs explain the `content=` option). Type the name of the FTS5 virtual table that indexes entry titles and bodies.",
      accept: ["entries_fts"],
      explain:
        "`entries_fts` is an **external-content** FTS5 table: it stores tokens only and points at `entries.rowid`. Declaring it is the easy part; the design consequence is that SQLite will not keep it in step with `entries` for you.\n\n- **Therefore:** V2 adds `entries_ai`, `entries_ad` and `entries_au` triggers, and first **backfills** existing rows. Skip the backfill and every entry written before V2 is unsearchable.\n- **Failure mode:** forget a trigger and search returns stale or missing text with no error. `rebuildSearchIndex()` is the repair tool.\n- V4 later replaces `entries_au` with `AFTER UPDATE OF title, body`, as a new migration step.\n\nIn the tutorial: *M3 Search & migration #2* and the \"FTS drift\" failure mode.",
      links: [{ title: "SQLite FTS5 extension", url: "https://www.sqlite.org/fts5.html" }, { title: "SQLite rowid tables", url: "https://www.sqlite.org/rowidtable.html" }],
    },
    {
      id: "offline-journal-10",
      type: "mcq",
      level: 1,
      topics: ["Auth & Security"],
      files: [
        "src/projects/offline-journal/hooks/useAppLock.ts",
        "src/app/projects/offline-journal/(tab)/settings.tsx",
      ],
      prompt:
        "In `hooks/useAppLock.ts`, the settings say `biometricLock: true`, but the user has since removed their device passcode and has no biometrics enrolled, so `canAuthenticate()` returns false. Read `canAuthenticate()` and `authenticate()` and compare with the `getEnrolledLevelAsync` entry in the expo-local-authentication docs. What does `authenticate()` do?",
      choices: [
        "Calls `unlock()` and returns true without prompting, so the user is never locked out of their own data",
        "Keeps the journal locked until the user enrolls biometrics again",
        "Falls back to a custom PIN screen backed by expo-secure-store",
        "Calls `LocalAuthentication.authenticateAsync` anyway, which always shows a passcode keypad",
      ],
      answer: 0,
      explain:
        "The rule is *never brick the user out of their own data*. `canAuthenticate()` is true for hardware plus enrolment **or** any enrolled security level (a device passcode alone counts). If neither holds there is nothing to prompt with, so `authenticate()` calls `unlock()` and returns true.\n\n- **Failure mode otherwise:** the user removes their passcode with the lock still on, and the journal stays covered forever, with no way back in short of reinstalling.\n- The other direction is guarded in Settings: `toggleLock` refuses to enable the lock without an authenticator and only turns it on after a successful prompt.\n\nIn the tutorial: *M7 Lock, export, polish* (the hydration/enrolment bullet) and the `useAppLock` listing.",
      links: [{ title: "expo-local-authentication reference", url: "https://docs.expo.dev/versions/latest/sdk/local-authentication/" }],
    },
    {
      id: "offline-journal-11",
      type: "text",
      level: 1,
      topics: ["Background Tasks"],
      files: ["src/projects/offline-journal/sync/task.ts"],
      prompt:
        "Open `sync/task.ts`. Grep the imports in `sync/task.ts` to find which package exports the background API. Type the npm package that provides `registerTaskAsync(SYNC_TASK, { minimumInterval: 15 })`, `getStatusAsync()` and `BackgroundTaskResult`.",
      accept: ["expo-background-task", /^expo[-\s]?background[-\s]?task$/i],
      explain:
        "Two packages cooperate: `expo-task-manager` defines **what** the task does (`defineTask`), and `expo-background-task` asks the OS **when** to run it (`registerTaskAsync`, `getStatusAsync`, `BackgroundTaskResult`). It replaces the older `expo-background-fetch`.\n\n- **Design decision:** treat the task as a hint. `registerSyncTask()` checks `getStatusAsync() === Available` and quietly returns false in Expo Go or on the web; `minimumInterval` is in minutes and is only a minimum.\n- **Failure mode if you rely on it:** iOS may run it hours later or never, so a sync that only works from the background task looks broken. Every other trigger (foreground, network regained, manual, debounced local write) works without it.\n\nIn the tutorial: *M6 Sync engine* (`sync/task.ts`) and the \"Background task that never fires\" failure mode.",
      links: [{ title: "expo-background-task reference", url: "https://docs.expo.dev/versions/latest/sdk/background-task/" }, { title: "expo-task-manager reference", url: "https://docs.expo.dev/versions/latest/sdk/task-manager/" }],
    },
    {
      id: "offline-journal-12",
      type: "mcq",
      level: 1,
      topics: ["Offline & Sync", "SQLite"],
      files: [
        "src/projects/offline-journal/db/queries/entries.ts",
        "src/projects/offline-journal/db/queries/outbox.ts",
      ],
      prompt:
        "`saveEntry()` upserts the entry row and calls `enqueue()` inside one `db.withTransactionAsync`. Read `enqueue()`'s doc comment and ask what a crash between the two statements would leave behind. What is the main reason?",
      choices: [
        "The row change and its outbox item commit together or not at all, so the queue can never disagree with the data it is meant to ship",
        "It makes `addDatabaseChangeListener` fire a single event for the whole save",
        "`enqueue()` would otherwise open its own nested transaction and fail",
        "SQLite only allows `ON CONFLICT … DO UPDATE` inside an explicit transaction",
      ],
      answer: 0,
      explain:
        "This is the **transactional outbox**, the central offline-first technique. The row change and the record of what must be shipped commit together or not at all, so the queue can never disagree with the data.\n\n- **Failure mode otherwise:** kill the app between two separate writes and you get either a saved edit that never syncs (silent data divergence) or an outbox item for a row that does not exist (a push that can never succeed).\n- `enqueue()` deliberately opens no transaction of its own: SQLite has no nested `BEGIN`, so it must run inside the caller's. The same rule applies to `writeTags`, which is why `setTags` is a separate wrapper.\n- Change events still fire per row; `useLiveQuery` batches them.\n\nIn the tutorial: *Data model & flow → Write path* (\"The transaction is non-negotiable\").",
      links: [{ title: "SQLite transactions", url: "https://www.sqlite.org/lang_transaction.html" }, { title: "expo-sqlite reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" }],
    },

    // ---------------------------------------------------------------------
    // Level 2: how the pieces work
    // ---------------------------------------------------------------------
    {
      id: "offline-journal-13",
      type: "order",
      level: 2,
      topics: ["SQLite"],
      files: ["src/projects/offline-journal/db/migrations.ts"],
      prompt:
        "Put the steps of `migrate()` in `db/migrations.ts` in the order they run when upgrading an older database. Read the function top to bottom, then check the SQLite docs for why `journal_mode` cannot be set inside a transaction.",
      items: [
        "Run the connection PRAGMAs (`journal_mode = WAL`, `foreign_keys = ON`) outside any transaction",
        "Read the current `PRAGMA user_version`",
        "Open a transaction for the next missing version with `withTransactionAsync`",
        "Execute that version's SQL from `MIGRATIONS[next]`",
        "Set `PRAGMA user_version = next` inside the same transaction",
        "Let the transaction commit, then loop until `version === SCHEMA_VERSION`",
      ],
      explain:
        "The order encodes three SQLite facts. `journal_mode` cannot change inside a transaction, so the PRAGMAs run first. `foreign_keys` is **per connection** and is off by default, so `ON DELETE CASCADE` does nothing without it. Each version then gets its own transaction with the version bump inside.\n\n- **Failure mode:** one big transaction (or a bump outside it) means a crash leaves `user_version` out of step with the schema.\n- **How to evolve:** V3 uses `ALTER TABLE … ADD COLUMN`, an in-place change, so existing rows survive with NULL/default. V4 fixes a shipped trigger as a **new step**, because devices that ran V2 never run it again.\n\nIn the tutorial: *Data model & flow* (`migrate`) and the \"Migration that drops data\" failure mode.",
      links: [{ title: "SQLite PRAGMA reference (user_version, journal_mode, foreign_keys)", url: "https://www.sqlite.org/pragma.html" }, { title: "SQLite write-ahead logging", url: "https://www.sqlite.org/wal.html" }, { title: "SQLite ALTER TABLE", url: "https://www.sqlite.org/lang_altertable.html" }],
    },
    {
      id: "offline-journal-14",
      type: "multi",
      level: 2,
      topics: ["SQLite"],
      files: [
        "src/projects/offline-journal/db/migrations.ts",
        "src/projects/offline-journal/db/queries/search.ts",
        "src/projects/offline-journal/__tests__/migrations.test.ts",
      ],
      prompt:
        "Open the V2 and V4 migrations and `rebuildSearchIndex()` in `db/migrations.ts`, and skim `__tests__/migrations.test.ts` for what it asserts. Select all that apply.",
      choices: [
        "`entries_ad` removes a row from the index by inserting the special `'delete'` command with the OLD title and body",
        "Since V4, `entries_au` fires only when an UPDATE sets `title` or `body`, so `markDone`'s `dirty = 0, remote_id = …` write leaves the index alone",
        "Soft-deleting an entry removes it from `entries_fts`, which is why search never shows deleted entries",
        "Without the backfill `INSERT INTO entries_fts … SELECT … FROM entries`, entries written before V2 would never match a search until the index was rebuilt",
        "`rebuildSearchIndex()` repairs a broken index with the FTS5 `'rebuild'` command",
        "The triggers are only needed because FTS5 mirrors its content table automatically in WAL mode only",
        "V4 fixed the trigger by editing the V2 SQL in place, so every device picks it up on its next launch",
      ],
      answer: [0, 1, 3, 4],
      explain:
        "An external-content FTS5 table must be told about every change, with the **old** values for removals: `INSERT INTO entries_fts(entries_fts, rowid, …) VALUES('delete', …)`. An update is therefore delete-then-insert, and `'rebuild'` repairs the whole index.\n\n- **The V4 story is the design lesson.** V2 shipped `AFTER UPDATE ON entries`, so every bookkeeping write (`dirty`, `remote_id`, a soft delete) churned the index for nothing. The index only covers `title` and `body`, so V4 recreates the trigger as `AFTER UPDATE OF title, body`. It had to be a new step: editing V2 changes nothing for devices that already ran it.\n- Soft deletes leave the row indexed; `searchEntries()` hides it with `deleted_at IS NULL`.\n- `migrations.test.ts` proves the narrowing with `total_changes()`.\n\nIn the tutorial: *M3* (the V4 bullet) and the \"FTS drift\" failure mode.",
      links: [{ title: "SQLite FTS5 extension", url: "https://www.sqlite.org/fts5.html" }, { title: "SQLite CREATE TRIGGER", url: "https://www.sqlite.org/lang_createtrigger.html" }],
    },
    {
      id: "offline-journal-15",
      type: "mcq",
      level: 2,
      topics: ["SQLite", "Testing"],
      files: [
        "src/projects/offline-journal/db/queries/search.ts",
        "src/projects/offline-journal/__tests__/text.test.ts",
      ],
      prompt:
        "Open `toMatchQuery()` in `db/queries/search.ts` and trace the call by hand (check against `__tests__/text.test.ts`). What does this return?",
      code: "toMatchQuery('say \"hi\" -x OR')",
      choices: [
        "`\"say\"* \"\"\"hi\"\"\"* \"-x\"* \"OR\"*`",
        "`say \"hi\" -x OR`, passed through unchanged so FTS5 can apply its NOT and OR operators",
        "`say* hi* x*`, with punctuation and operators stripped",
        "`\"say hi x\"*`, a single prefix phrase",
      ],
      answer: 0,
      explain:
        "FTS5 `MATCH` takes a **query language**, not a plain string. A stray quote or a bare `-` is a syntax error, and `OR` / `NOT` are operators. Every search box is therefore an injection surface against your own query parser.\n\n- **The fix:** wrap each whitespace-separated word in double quotes (doubling inner quotes) so it is a literal, and append `*` for prefix matching, so typing \"syn\" finds \"sync\".\n- **Failure mode:** without the sanitiser, a user typing `say \"hi` crashes the screen with an SQL error mid-keystroke.\n- `text.test.ts` pins the exact output. Empty input becomes an empty match, and `searchEntries()` then falls back to the filter-only path or returns nothing.\n\nIn the tutorial: *M3 Search & migration #2* (the `search.ts` listing).",
      links: [{ title: "SQLite FTS5 extension", url: "https://www.sqlite.org/fts5.html" }],
    },
    {
      id: "offline-journal-16",
      type: "text",
      level: 2,
      topics: ["Offline & Sync", "Testing"],
      files: [
        "src/projects/offline-journal/sync/policy.ts",
        "src/projects/offline-journal/__tests__/policy.test.ts",
      ],
      prompt:
        "Open `mergeOutboxOp()` in `sync/policy.ts`. Read the function and its doc comment, then check against `__tests__/policy.test.ts`. Predict the three results in order and type them comma-separated (for example `a, b, c`).",
      code: 'mergeOutboxOp("create", "update")\nmergeOutboxOp("update", "delete")\nmergeOutboxOp("delete", "update")',
      accept: [/^create\s*,\s*delete\s*,\s*update$/i],
      explain:
        "`mergeOutboxOp` answers one question: *what does the server need in order to end up correct?* create+update stays `create` (the server never saw the row, so send the latest body); anything followed by delete is `delete`; delete followed by a re-save becomes the new op (an undo that saved again).\n\n- **Why compaction exists:** autosave writes about every 800 ms, and one request per pause is wasted traffic and queue growth.\n- **Why it is pure:** the rule lives in `sync/policy.ts` with no database or clock, so `policy.test.ts` covers every combination in milliseconds.\n- **Guard:** `enqueue()` only folds into rows with `attempts = 0`, because an attempted row may already have reached the server.\n\nIn the tutorial: *Data model & flow → Write path* (compaction paragraph) and *M6* (policy.ts).",
      links: [{ title: "AWS: exponential backoff and jitter", url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/" }],
    },
    {
      id: "offline-journal-17",
      type: "text",
      level: 2,
      topics: ["Offline & Sync"],
      files: [
        "src/projects/offline-journal/sync/policy.ts",
        "src/projects/offline-journal/db/queries/outbox.ts",
      ],
      prompt:
        "Open `backoffDelay()` in `sync/policy.ts`. Work it out from the code (no running needed), then compare with `__tests__/policy.test.ts`. Type the value, in milliseconds, that this call returns.",
      code: "backoffDelay(3, () => 0)",
      accept: ["8000", /^8[,_\s]?000(\s*ms)?$/i],
      explain:
        "Backoff is `min(2 ** attempts * 1000, 300_000)` plus up to a second of jitter, so 3 attempts is 8,000 ms when the injected `random` returns 0.\n\n- **Why jitter:** devices that went offline together (a tunnel, a Wi-Fi outage) would otherwise retry in lockstep forever and hammer the server at the same instant.\n- **Why the cap:** without it a long outage would push the next attempt hours away.\n- **How it is stored:** `failItem()` writes `next_attempt_at = now + delay`, `claimBatch()` skips rows still inside that window, and `attempts >= MAX_ATTEMPTS` (6) marks a dead letter. A plain column is all a retry queue needs.\n- `random` is an injectable parameter so the test can pin the jitter.\n\nIn the tutorial: *Data model & flow → Sync semantics* and *M6*.",
      links: [{ title: "AWS: exponential backoff and jitter", url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/" }],
    },
    {
      id: "offline-journal-18",
      type: "multi",
      level: 2,
      topics: ["Offline & Sync", "Axios / API"],
      files: [
        "src/projects/offline-journal/sync/policy.ts",
        "src/projects/offline-journal/sync/syncEngine.ts",
        "src/projects/offline-journal/__tests__/policy.test.ts",
      ],
      prompt:
        "Read `classifyStatus()` and its tests, and look up 408 and 429 in the MDN status reference. Select all HTTP statuses for which `classifyStatus()` in `sync/policy.ts` returns `\"retry\"`.",
      choices: ["408", "429", "404", "422", "503", "0 (no real HTTP status)"],
      answer: [0, 1, 4, 5],
      explain:
        "The classifier encodes *can retrying ever help?* 2xx is done. 408 (timeout) and 429 (rate limit) are transient, and 5xx is the server's problem, so they all back off. Every other 4xx means the server will never accept this payload, so `push()` calls `failItem(…, { permanent: true })` and the item becomes a **dead letter** shown in Settings.\n\n- **Failure mode if all 4xx retried:** a malformed or rejected edit is re-sent six times with growing delays and clogs the head of the FIFO queue. If 429 were treated as dead, rate limiting would lose user edits.\n- A thrown network error never reaches `classifyStatus`; `push()` catches it and uses a plain `failItem`, so offline stays queued.\n- Unknown values like 0 fall through to retry, which `policy.test.ts` checks.\n\nIn the tutorial: *Sync semantics to decide* and *M6*.",
      links: [{ title: "MDN: 429 Too Many Requests", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429" }, { title: "MDN: 408 Request Timeout", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/408" }],
    },
    {
      id: "offline-journal-19",
      type: "order",
      level: 2,
      topics: ["Offline & Sync"],
      files: ["src/projects/offline-journal/sync/syncEngine.ts"],
      prompt:
        "Read `run()` in `sync/syncEngine.ts` top to bottom (and grep for `getNetworkStateAsync`). Put the steps of one successful `run()` in order.",
      items: [
        "`ensureSettingsHydrated()`, returning `skipped: \"disabled\"` if sync is off or has no base URL",
        "`Network.getNetworkStateAsync()`, returning `skipped: \"offline\"` only if reachability is explicitly false",
        "`getDb()`, which opens and migrates the database if no screen has done it yet",
        "Set the sync store's phase to `\"syncing\"`",
        "`pull()`: fetch `/entries?since=<cursor>` and upsert the remote rows in one transaction",
        "`push()` the claimed outbox batch, then write `last_synced_at` and delete `last_error`",
      ],
      explain:
        "Cheap checks come first, expensive ones last. The run bails with `skipped: \"disabled\"` before touching the network, and with `\"offline\"` before spending a backoff step on every queued item when it already knows there is no route. Only an explicit `false` means offline; `undefined` means unknown, so it tries.\n\n- **`getDb()` before any SQL:** a headless background launch can arrive before `SQLiteProvider`'s `onInit` has ever run, so the engine opens and migrates the database itself.\n- **Pull before push:** remote changes merge first so unsent local edits survive the conflict rule and win on push.\n- **Errors never crash:** a failure is saved to `sync_meta.last_error` and returned, because the outbox still holds every change.\n\nIn the tutorial: *M6 Sync engine* (the `syncEngine.ts` listing).",
      links: [{ title: "expo-network reference", url: "https://docs.expo.dev/versions/latest/sdk/network/" }],
    },
    {
      id: "offline-journal-20",
      type: "mcq",
      level: 2,
      topics: ["Offline & Sync", "Architecture"],
      files: ["src/projects/offline-journal/sync/syncEngine.ts"],
      prompt:
        "A sync run is in progress. Read `kick()` in `sync/syncEngine.ts` (note `inFlight` and `again`). The user taps \"Sync now\", which calls `kick()`, twice more. What happens?",
      choices: [
        "Both calls get the in-flight promise back and `again` is set, so exactly one follow-up run starts once the current run finishes",
        "Two more runs start in parallel, each claiming its own batch from the outbox",
        "Both calls are ignored, and the user has to tap again after the run ends",
        "The current run is aborted and restarted with fresh settings",
      ],
      answer: 0,
      explain:
        "`kick()` is a **run-lock with one queued follow-up**. While a run is in flight, further kicks return the same promise and set `again`; when the run ends, exactly one more run starts. Five triggers feed it (foreground, network regained, manual, debounced local write, background task), so concurrency is the normal case, not an edge case.\n\n- **Failure mode without the lock:** two runs claim the same outbox rows and push them twice. Idempotency keys make that survivable, but you still pay duplicate traffic and confusing status.\n- **Why the follow-up:** an edit saved during a run would otherwise wait for the next trigger.\n- `kick()` also cancels a pending `kickSoon()` timer, because any run ships the whole outbox.\n\nIn the tutorial: the \"Duplicate sync\" failure mode and *M6*.",
      links: [{ title: "MDN: idempotent", url: "https://developer.mozilla.org/en-US/docs/Glossary/Idempotent" }],
    },
    {
      id: "offline-journal-21",
      type: "multi",
      level: 2,
      topics: ["Offline & Sync", "Background Tasks", "React Hooks"],
      files: [
        "src/projects/offline-journal/hooks/useSyncStatus.ts",
        "src/projects/offline-journal/hooks/useEntries.ts",
        "src/projects/offline-journal/sync/syncEngine.ts",
      ],
      prompt:
        "Open `useSyncTriggers()` in `hooks/useSyncStatus.ts` and `useSaveEntry()` in `hooks/useEntries.ts`. Grep for `kick(` and `kickSoon(` across `src/projects/offline-journal` to see every caller. With sync enabled, which of these start a sync run? Select all that apply.",
      choices: [
        "The journal layout mounting, or sync being turned on (an immediate `kick()`)",
        "The app coming back to the `active` AppState",
        "The network going from unreachable to reachable",
        "Every autosave, which immediately runs a full pull and push",
        "The OS waking the app for the registered background task",
        "Every network state event, even when the device was already online",
      ],
      answer: [0, 1, 2, 4],
      explain:
        "`useSyncTriggers` is mounted **once**, in the project layout, so listeners are not multiplied by every screen that shows status. It kicks on mount, when `AppState` returns to `active`, and on the network's **transition** from unreachable to reachable (edge-triggered, not every event). It also registers the background task, and unregisters it when sync is turned off.\n\n- **Local writes are different:** `useSaveEntry` calls `kickSoon()`, a 10-second trailing debounce. The outbox already holds the change durably, so there is no reason to run a full pull and push after every autosave pause.\n- **Failure mode otherwise:** a sync storm while typing, or repeated syncs on every network-state event.\n\nIn the tutorial: *M6* (the trigger bullets and `useSyncStatus.ts`).",
      links: [{ title: "expo-network reference", url: "https://docs.expo.dev/versions/latest/sdk/network/" }, { title: "React Native: AppState", url: "https://reactnative.dev/docs/appstate" }],
    },
    {
      id: "offline-journal-22",
      type: "mcq",
      level: 2,
      topics: ["Auth & Security", "Accessibility"],
      files: [
        "src/projects/offline-journal/hooks/useAppLock.ts",
        "src/projects/offline-journal/components/LockGate.tsx",
      ],
      prompt:
        "Read `useAppLock` and `LockGate` side by side before answering. Biometric lock is on with **Lock after: 1 min** (`lockAfterMs: 60000`). The user opens the app switcher, waits 10 seconds and returns to the journal. What happens?",
      choices: [
        "The journal is covered, without a prompt, as soon as the app goes `inactive`. On return the cover lifts and no Face ID prompt appears, because 10 s is inside the grace period",
        "Nothing is covered in the switcher, because the grace period hasn't elapsed",
        "The journal locks immediately and asks for Face ID on return, because `inactive` always locks",
        "The whole Stack unmounts while covered, so the user comes back to the timeline root",
      ],
      answer: 0,
      explain:
        "Two separate concerns hide in one scenario. **Hiding** must be immediate: the OS snapshots the UI when the app goes `inactive`, so `obscured` flips on at once, regardless of the grace period. **Locking** (requiring auth) only happens on return if `Date.now() - leftAt >= graceMs`.\n\n- **Failure mode if you only lock after the grace period:** the app-switcher preview shows the journal for the whole grace window, which leaks private text.\n- `LockGate` keeps rendering the children and puts an opaque cover over them rather than unmounting, so navigation state survives and no prompt appears while merely obscured. Content is hidden from VoiceOver while covered.\n\nIn the tutorial: *M7* and the \"App switcher leak\" failure mode.",
      links: [{ title: "React Native: AppState", url: "https://reactnative.dev/docs/appstate" }, { title: "expo-local-authentication reference", url: "https://docs.expo.dev/versions/latest/sdk/local-authentication/" }],
    },
    {
      id: "offline-journal-23",
      type: "multi",
      level: 2,
      topics: ["Notifications", "Platform Differences"],
      files: [
        "src/projects/offline-journal/reminders/scheduleReminder.ts",
        "src/projects/offline-journal/reminders/handlers.ts",
        "src/app/_layout.tsx",
      ],
      prompt:
        "Open `reminders/scheduleReminder.ts`, `reminders/handlers.ts` and `src/app/_layout.tsx`, and check `setNotificationChannelAsync` and `getPermissionsAsync` in the expo-notifications docs. Select all that apply.",
      choices: [
        "A fixed `identifier` (`daily-journal-reminder`) makes rescheduling idempotent: cancel, then schedule again under the same id",
        "On Android, `ensureChannel()` creates the notification channel before the permission request",
        "`getPermissionState()` returns `\"blocked\"` when permission isn't granted and `canAskAgain` is false, so the UI can send the user to Settings",
        "The root layout requests notification permission at launch so reminders work after a cold start",
        "`setNotificationHandler` is called at module scope in `handlers.ts`, so it exists before the first notification arrives",
        "The tap router follows any `data.url` found in a notification payload",
      ],
      answer: [0, 1, 2, 4],
      explain:
        "Four small decisions make reminders reliable. A **fixed identifier** makes rescheduling idempotent (cancel, then schedule), so changing the time never stacks duplicates. On Android the **channel must exist before the permission prompt**. `getPermissionState()` distinguishes \"blocked\" from \"undetermined\" so the UI can send the user to system Settings. The handler is set at **module scope** so it exists before the first notification arrives.\n\n- **Failure mode:** requesting permission at launch burns the one-shot system prompt before the user understands why; the app asks after its own rationale (the onboarding slide).\n- The router follows only URLs under `/projects/offline-journal/`: notification data is input, and the store routes its own pushes.\n\nIn the tutorial: *M5 Reminders*.",
      links: [{ title: "expo-notifications reference", url: "https://docs.expo.dev/versions/latest/sdk/notifications/" }],
    },
    {
      id: "offline-journal-24",
      type: "mcq",
      level: 2,
      topics: ["React Hooks"],
      files: [
        "src/projects/offline-journal/hooks/useAutosave.ts",
        "src/app/projects/offline-journal/entry/compose.tsx",
      ],
      prompt:
        "In the compose screen, the user types one character and swipes the modal closed 300 ms later, before the 800 ms debounce fires. Open `hooks/useAutosave.ts`. Trace the three effects in `useAutosave.ts` in the order they clean up. Is the character saved?",
      choices: [
        "Yes. The unmount cleanup `useEffect(() => () => void flush(), [flush])` saves the latest value, because `dirty` is still true",
        "No. The pending `setTimeout` is cleared on unmount, so the keystroke is lost",
        "Yes, but only because the AppState changes to `background` when a modal closes",
        "No. `skipFirst` skips the first change after mount",
      ],
      answer: 0,
      explain:
        "Autosave has three rescue paths because three different events can end an edit: the debounce timer, the app leaving `active`, and the component unmounting. Swiping a modal closed hits the third: the debounce effect's cleanup clears the timer, but a **separate** unmount effect calls `flush()`.\n\n- **Why it saves the newest value:** `flush()` reads `latest.current`, a ref updated by an effect, instead of a stale closure.\n- **Why `dirty` exists:** it stops `flush` from writing when nothing changed, because every write becomes an outbox operation.\n- **Failure mode otherwise:** the last second of typing is lost whenever the user dismisses by gesture, and nobody notices until they reopen the entry.\n- `skipFirst` only avoids writing an untouched draft at mount.\n\nIn the tutorial: *M2* (the `useAutosave` paragraph).",
      links: [{ title: "React: useEffect", url: "https://react.dev/reference/react/useEffect" }, { title: "React: useRef", url: "https://react.dev/reference/react/useRef" }],
    },
    {
      id: "offline-journal-25",
      type: "explain",
      level: 2,
      topics: ["React Hooks", "Offline & Sync"],
      files: [
        "src/projects/offline-journal/hooks/useDeleteWithUndo.ts",
        "src/app/projects/offline-journal/(tab)/index.tsx",
      ],
      prompt:
        "Open `hooks/useDeleteWithUndo.ts` and the timeline screen (grep for `pendingId`). Swiping hides the row immediately, but `commitDelete` (soft delete + outbox) only runs after a 4 s undo window. Explain why the hook delays the database write instead of soft-deleting at once and reverting on Undo, and what `flushPending` protects against.",
      model:
        "Holding the write back makes Undo free: the screen filters `pendingId` out of the rows, so cancelling just clears the timer and nothing touches SQLite or the outbox. Deleting immediately would queue a delete and then a re-save, and if a sync ran in between, the server would actually see the delete. The hook takes a `commitDelete` function rather than a db handle, so it doesn't care what \"delete\" means. `flushPending` commits the waiting delete right away when a second row is swiped and when the screen unmounts, so a delete the user asked for is never silently dropped. The cost is that the delete isn't durable until the window closes or a flush happens: if the app is killed within those 4 seconds the entry comes back, which is the safe way to fail.",
      rubric: [
        "Undo before commit is free: no SQLite write and no outbox churn, the row is only filtered out by `pendingId`",
        "Committing immediately would enqueue a delete plus a re-save, and a sync in between would replicate the delete",
        "`flushPending` commits the earlier pending delete on a second swipe and on unmount",
        "Names the trade-off: the delete isn't durable during the window (killing the app brings the entry back)",
      ],
      explain:
        "Making Undo free is the design goal. The swipe only hides the row (the screen filters `pendingId` out of the list); the soft delete and outbox write wait for the 4 s window to close. Undo then just clears a timer: no SQLite write, no outbox churn.\n\n- **Failure mode of delete-then-revert:** a delete is enqueued, then a re-save; if a sync runs between them, the server really deletes the entry.\n- **`flushPending`** commits the waiting delete when a second row is swiped and on unmount, so a delete the user asked for is never silently dropped.\n- **Trade-off:** killing the app inside the window brings the entry back, which is the safe direction to fail.\n- The hook takes a `commitDelete` function, not a db handle, so it knows nothing about SQLite: it is a dumb, reusable timer.\n\nIn the tutorial: *Interaction details worth building properly* and *M2*.",
      links: [{ title: "React: useRef", url: "https://react.dev/reference/react/useRef" }, { title: "React: useEffect", url: "https://react.dev/reference/react/useEffect" }],
    },
    {
      id: "offline-journal-26",
      type: "text",
      level: 2,
      topics: ["Zustand"],
      files: ["src/projects/offline-journal/stores/settingsStore.ts"],
      prompt:
        "Open `stores/settingsStore.ts`. A future release adds a new key to the default `sync` object. Users upgrading from the old release have a saved `sync` object without that key. Check the Zustand persist docs for the option that controls how stored state is combined with initial state. Type the name of the `persist` option this store overrides so the new nested default isn't wiped out by the saved object.",
      accept: ["merge"],
      explain:
        "Zustand's default `persist` merge is **shallow**: `{ ...current, ...persisted }`. A saved `sync` object therefore replaces the whole default `sync` object, and any key added in a later release disappears (`undefined`, not the new default).\n\n- **Design decision:** a custom `merge` spreads `current.reminder` and `current.sync` beneath the saved values, so new nested defaults survive upgrades.\n- **Failure mode:** after an update, a feature that depends on the new key behaves as if unconfigured for existing users only, a bug you never see on a fresh install.\n- Neighbouring options: `partialize` strips the `patch` functions from what is written, and `version: 1` leaves room for a `migrate` function.\n\nIn the tutorial: *M7* (`settingsStore.ts`).",
      links: [{ title: "Zustand: persisting store data", url: "https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data.html" }],
    },
    {
      id: "offline-journal-27",
      type: "multi",
      level: 2,
      topics: ["Testing", "Architecture"],
      files: [
        "src/projects/offline-journal/__tests__",
        "src/projects/offline-journal/utils/id.ts",
        "src/projects/offline-journal/utils/timeline.ts",
        "src/projects/offline-journal/utils/exportFormat.ts",
        "src/projects/offline-journal/sync/policy.ts",
        "src/projects/offline-journal/testing/nodeDatabase.ts",
        "src/projects/offline-journal/__tests__/syncEngine.test.ts",
        "src/projects/offline-journal/__tests__/migrations.test.ts",
      ],
      prompt:
        "Look through `src/projects/offline-journal/__tests__/` and `testing/nodeDatabase.ts`. Open the test files and `testing/nodeDatabase.ts`; for each choice, find the seam in the source. Which design choices let these modules be unit-tested under Jest without native modules? Select all that apply.",
      choices: [
        "`ulid()` takes `randomBytes` as a parameter, so tests pass fixed bytes and the `expo-crypto` mock only has to satisfy the import",
        "`backoffDelay()` takes an injectable `random`, so the jitter can be pinned to 0 or 0.999",
        "`toRows()` takes an injectable `now`, so the TODAY and YESTERDAY labels are deterministic",
        "Export formatting lives in `exportFormat.ts`, separate from the filesystem and share-sheet code in `export.ts`",
        "Every query takes the db handle as its first argument, so a small adapter over Node's built-in `node:sqlite` can stand in for expo-sqlite and the real migrations, triggers and sync SQL run against a real engine",
        "The migrations are tested against an in-memory expo-sqlite database under Jest",
        "`syncEngine.ts` was refactored to take its db and transport as parameters, so the test passes fakes into `kick()`",
      ],
      answer: [0, 1, 2, 3, 4],
      explain:
        "The pattern is to keep every side effect behind a **seam** so the logic can run under Jest with no native modules. Pure helpers take clock and randomness as parameters (`ulid`, `backoffDelay`, `toRows`). `policy.ts` holds every sync decision with no I/O. Export formatting is split from the file and share-sheet code. Queries take the db handle first, so `openTestDatabase()` (an expo-sqlite-shaped adapter over `node:sqlite`) runs the real migrations, FTS5 triggers and outbox SQL.\n\n- **Failure mode of mocking SQL:** a green test suite that never executed a trigger.\n- `syncEngine.ts` was **not** refactored for injection: `syncEngine.test.ts` mocks only the edges (`getDb`, `request`, `expo-network`, the settings store) and drives the real `kick()`.\n\nIn the tutorial: *Testing & verification*.",
      links: [{ title: "Jest: mock functions", url: "https://jestjs.io/docs/mock-functions" }, { title: "Node.js: node:sqlite", url: "https://nodejs.org/api/sqlite.html" }],
    },
    {
      id: "offline-journal-28",
      type: "order",
      level: 2,
      topics: ["Media", "File System", "SQLite"],
      files: [
        "src/projects/offline-journal/utils/attachments.ts",
        "src/projects/offline-journal/db/queries/attachments.ts",
      ],
      prompt:
        "Read `attachImage()` in `utils/attachments.ts` top to bottom (and the expo-image-manipulator docs for `manipulate`). Put the steps in order.",
      items: [
        "Pick an image with expo-image-picker (asking for camera permission first when the source is the camera)",
        "Downscale to at most 1600 px wide with expo-image-manipulator and save as JPEG",
        "Render a 320 px thumbnail from the saved image",
        "Generate a blurhash from the thumbnail (a failure gives null instead of an error)",
        "Copy both files from the cache into `Paths.document` under `attachments/`",
        "Insert the `attachments` row with paths relative to the document directory",
      ],
      explain:
        "The order is driven by file lifetimes. The picker and the manipulator both return **cache URIs** that the OS may reclaim, so the files are copied into `Paths.document` *before* any row refers to them. The row stores a path **relative** to the document directory, because the absolute iOS container path changes across app updates; `resolveAttachmentUri()` rebuilds it at read time.\n\n- **Failure mode if a cache URI is stored:** it works for days, then the OS clears space and the row points at nothing on someone else's device.\n- Downscaling first (never upscaling) avoids a 12 MP original in a list row; the blurhash is a nicety that must not lose the photo, so its failure yields `null`.\n- Deletes run in reverse (row first, file second), and `sweepOrphans()` is the safety net for a crash in between.\n\nIn the tutorial: *M4 Attachments & filesystem*.",
      links: [{ title: "expo-image-picker reference", url: "https://docs.expo.dev/versions/latest/sdk/imagepicker/" }, { title: "expo-image-manipulator reference", url: "https://docs.expo.dev/versions/latest/sdk/imagemanipulator/" }, { title: "expo-file-system reference", url: "https://docs.expo.dev/versions/latest/sdk/filesystem/" }, { title: "expo-image reference", url: "https://docs.expo.dev/versions/latest/sdk/image/" }],
    },
    {
      id: "offline-journal-41",
      type: "mcq",
      level: 2,
      topics: ["SQLite", "React Hooks"],
      files: [
        "src/projects/offline-journal/hooks/useLiveQuery.ts",
        "src/projects/offline-journal/db/client.ts",
      ],
      prompt:
        "Open `hooks/useLiveQuery.ts`. The listener drops an event unless `basename(event.databaseFilePath)` equals `basename(db.databasePath)`, before it even looks at `tableName`. Compare the `DatabaseChangeEvent` fields in the expo-sqlite docs with what `useLiveQuery.ts` reads. Why check the file at all, and why compare basenames instead of full paths?",
      choices: [
        "`addDatabaseChangeListener` is process-global: every database opened with `enableChangeListener` (fitness's too) reports through it, so table names alone would misfire the day another project adds a table with a journal table's name. SQLite reports the path it resolved, which need not equal the one that was passed in (on iOS `/private/var/…` for `/var/…`)",
        "The listener is per handle, but `SQLiteProvider` and `getDb()` are two handles, so the file check stops each from refreshing the other's queries",
        "`tableName` is empty for writes made inside a transaction, so the file is the only field that is always set",
        "The native layer already compares full paths; the basename check only strips the `file://` scheme",
      ],
      answer: 0,
      explain:
        "`addDatabaseChangeListener` is **process-global**: every database opened with `enableChangeListener` (the fitness tracker's, on every stored GPS point) reports through it. Table names alone work only until another project adds a table with a journal table's name, so the hook also matches the database **file**.\n\n- **Why basenames:** the event's path comes from SQLite's resolved filename (on iOS `/private/var/…` for `/var/…`), not from the string JS passed in, so full-path equality is fragile. `journal.db` is unique per project.\n- **Failure mode otherwise:** unrelated writes trigger needless re-queries now, and wrong-data refreshes the day a name collides.\n- This is a launcher-isolation lesson: shared process APIs need project-specific discriminators.\n\nIn the tutorial: *Fitting into the launcher* (the \"Process-global APIs\" row) and the `useLiveQuery` listing.",
      links: [{ title: "expo-sqlite reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" }],
    },
    {
      id: "offline-journal-43",
      type: "multi",
      level: 2,
      topics: ["Zustand", "Performance"],
      files: [
        "src/app/projects/offline-journal/(tab)/settings.tsx",
        "src/projects/offline-journal/stores/settingsStore.ts",
      ],
      prompt:
        "The Settings screen reads the store with `useSettingsStore(useShallow((s) => ({ theme: s.theme, …, sync: s.sync })))`, and the actions with separate `useSettingsStore((s) => s.patch)` selectors, instead of a bare `useSettingsStore()`. Compare the selectors at the top of `(tab)/settings.tsx` with the Zustand `useShallow` docs. Select all that apply.",
      choices: [
        "The screen re-renders only when one of the picked fields changes. A bare `useSettingsStore()` subscribes to the whole state, so any write, such as `patch({ onboarded: false })` or a field added later, re-renders it",
        "Without `useShallow`, the inline object selector would return a new object on every call. Zustand v5 would see a changed snapshot each time and the render loop would never settle",
        "`useShallow` compares deeply, so `patchSync({ baseUrl })` does not re-render the screen",
        "It stops the `persist` middleware from writing unchanged fields to AsyncStorage",
        "`patch` and `patchSync` are created once in `create()` and never change, so plain selectors for them never trigger a render",
      ],
      answer: [0, 1, 4],
      explain:
        "A selector decides what a component subscribes to. `useShallow` compares the returned object one level deep, so an unchanged selection is the same snapshot; without it, an inline `{...}` selector returns a **new object every call**, and Zustand v5 would see a changed snapshot each time (a render loop). A bare `useSettingsStore()` subscribes to everything, so any write re-renders the screen.\n\n- Action functions (`patch`, `patchSync`) are created once in `create()`, so plain selectors for them never cause renders.\n- One level is the point: `patchSync` builds a new `sync` object, so a real sync change still re-renders, as it should.\n- Persistence is separate: `partialize` decides what is written.\n- **Why bother on a small screen:** the habit keeps the screen from re-rendering more as the store grows.\n\nIn the tutorial: *M7* (`settingsStore.ts`).",
      links: [{ title: "Zustand: useShallow", url: "https://zustand.docs.pmnd.rs/reference/hooks/use-shallow.html" }, { title: "Zustand: persisting store data", url: "https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data.html" }, { title: "React: memo", url: "https://react.dev/reference/react/memo" }],
    },

    // ---------------------------------------------------------------------
    // Level 3: failure modes and design trade-offs
    // ---------------------------------------------------------------------
    {
      id: "offline-journal-29",
      type: "mcq",
      level: 3,
      topics: ["Offline & Sync"],
      files: ["src/projects/offline-journal/db/queries/outbox.ts"],
      prompt:
        "`enqueue()` only folds a new op into an existing outbox row `WHERE entity_id = ? AND attempts = 0`. Read `enqueue()` in `db/queries/outbox.ts`, then reason about what the server may already have seen. Why not fold into any waiting row for that entity?",
      choices: [
        "A row that has been attempted may already have reached the server (its response may have been lost), so a newer op has to be sent after it as a separate item to keep the order correct",
        "Rows with `attempts > 0` are dead letters about to be deleted",
        "SQLite can't UPDATE a row that another transaction has read",
        "Folding into an attempted row would reset its backoff, which breaks the server's rate limit",
      ],
      answer: 0,
      explain:
        "Once an item has been sent, you cannot know what the server applied: the response may have been lost. Rewriting an **attempted** row could reorder or erase operations the server may already have seen (an edit folded into an attempted delete would never send the delete). So `enqueue()` folds only into rows with `attempts = 0`.\n\n- **Subtlety:** attempts only increase on *failure*, so a row being pushed for the first time still has `attempts = 0`. A fold can land on an in-flight row, which is exactly what `completeItem`'s payload check handles.\n- **Failure mode:** silent reordering is the worst kind of sync bug: no error, wrong final state on the server.\n\nIn the tutorial: *Data model & flow → Write path* (compaction paragraph) and the \"Edit lost in flight\" failure mode.",
      links: [{ title: "AWS: exponential backoff and jitter", url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/" }],
    },
    {
      id: "offline-journal-30",
      type: "explain",
      level: 3,
      topics: ["Offline & Sync", "SQLite"],
      files: [
        "src/projects/offline-journal/db/queries/outbox.ts",
        "src/projects/offline-journal/sync/syncEngine.ts",
        "src/projects/offline-journal/__tests__/syncEngine.test.ts",
      ],
      prompt:
        "Open `db/queries/outbox.ts`. `completeItem()` runs `DELETE FROM outbox WHERE id = ? AND payload = ?` rather than just `WHERE id = ?`. Find the matching test in `__tests__/syncEngine.test.ts` first. Describe the exact sequence of events this guards against, and what would be lost without it.",
      model:
        "`push()` claims an item and sends its PUT. While the request is in flight the row still has `attempts = 0`, because attempts only increase on failure. If autosave writes a newer edit during that time, `enqueue()` finds the same row and folds the new op and payload into it. When the first PUT comes back 2xx, deleting by id alone would remove the row that now carries the newer, unsent edit, so the server would never receive it. `markDone` would then also clear `dirty`, because no outbox row is left, and that drops the pull's protection for the local edit. With the payload check the DELETE affects 0 rows, the newer payload stays queued for the next run, and `markDone`'s `NOT EXISTS` guard keeps `dirty = 1`.",
      rubric: [
        "An in-flight item still has `attempts = 0`, so `enqueue()` can fold a newer edit into it",
        "Deleting by id alone would drop that newer edit, which then never reaches the server",
        "With the payload check the delete matches 0 rows and the edit ships on the next run",
        "Mentions the knock-on effect on `dirty` and `markDone`'s `NOT EXISTS` guard",
      ],
      explain:
        "This is optimistic concurrency done as a **compare-and-delete**: the payload is the version. The sequence: `push()` sends a PUT; the row still has `attempts = 0`; autosave folds a newer edit into the same row; the first PUT returns 2xx; `DELETE … WHERE id = ?` would remove the row now carrying the unsent edit.\n\n- **Impact:** the newer edit never reaches the server, and `markDone` would also clear `dirty` (nothing queued), removing the pull's protection for that local edit. A later pull could overwrite it. Silent data loss.\n- **With the check:** the DELETE matches 0 rows, the newer payload stays queued, and `markDone`'s `NOT EXISTS` keeps `dirty = 1`.\n- The same idea applies to any queue item that can change while a worker holds it. `syncEngine.test.ts` reproduces the sequence.\n\nIn the tutorial: the \"Edit lost in flight\" failure mode and the `outbox.ts` listing.",
      links: [{ title: "SQLite transactions", url: "https://www.sqlite.org/lang_transaction.html" }, { title: "MDN: idempotent", url: "https://developer.mozilla.org/en-US/docs/Glossary/Idempotent" }],
    },
    {
      id: "offline-journal-31",
      type: "mcq",
      level: 3,
      topics: ["Offline & Sync", "SQLite"],
      files: ["src/projects/offline-journal/sync/syncEngine.ts"],
      prompt:
        "`markDone()` clears the dirty flag with `UPDATE entries SET dirty = 0, … WHERE id = ? AND NOT EXISTS (SELECT 1 FROM outbox WHERE entity_id = ?)`. Grep for `dirty` across `src/projects/offline-journal` to see every reader before you answer. What would break if the `NOT EXISTS` clause were removed?",
      choices: [
        "A row that still has a newer queued edit would be marked clean (`dirty = 0`), so the pull's conflict guard would stop protecting it, and a remote version with a later `updated_at` could overwrite the unsent local edit",
        "The outbox row would never be deleted, so it would be pushed forever",
        "`remote_id` would be set to NULL on every push",
        "Nothing important: `dirty` is only cosmetic and is read by `SyncBanner`",
      ],
      answer: 0,
      explain:
        "`dirty = 1` means *this row has local changes the server has not confirmed*. Two things depend on it: `pull()` only overwrites rows with `dirty = 0`, and `purgeDeleted()` only hard-deletes `dirty = 0` tombstones. `markDone` therefore clears it only when **no outbox item for the entity remains**.\n\n- **Failure mode without `NOT EXISTS`:** push confirms an old edit while a newer one is still queued; the row becomes \"clean\", a pull with a later `updated_at` overwrites the unsent edit, and it is lost.\n- `SyncBanner` does not read `dirty`; its counts come from `outboxStats()`, so the flag is correctness machinery, not cosmetics.\n\nIn the tutorial: the \"Pull clobbers local edits\" and \"Edit lost in flight\" failure modes.",
      links: [{ title: "SQLite transactions", url: "https://www.sqlite.org/lang_transaction.html" }],
    },
    {
      id: "offline-journal-32",
      type: "explain",
      level: 3,
      topics: ["Offline & Sync", "SQLite"],
      files: [
        "src/projects/offline-journal/sync/syncEngine.ts",
        "src/projects/offline-journal/sync/policy.ts",
      ],
      prompt:
        "Open `pull()` in `sync/syncEngine.ts`. Read the upsert and the contract comment at the top of `syncEngine.ts`. Explain the conflict policy in the upsert's `WHERE entries.dirty = 0 AND entries.updated_at < excluded.updated_at`, why `run()` pulls before it pushes, and why tags are only written when `result.changes > 0`.",
      model:
        "The policy is last-write-wins by `updated_at`, with one override: a local row with unsent edits (`dirty = 1`) is never overwritten by a pull. A remote row wins only if the local copy is clean and strictly older, so equal timestamps leave the local row alone. Pulling first merges remote changes before pushing. The push then sends the local edits that survived, the server upserts them on the ULID, and the local version becomes the newest everywhere (\"remote first, so unsent local edits win\"). When the WHERE rejects the update, `runAsync` reports `changes = 0`, so tags are only rewritten for a remote row that actually won. Otherwise a losing remote row could still replace the local tags. The cursor (`last_pulled_at = serverTime`) is saved in the same transaction, so it never moves past rows that weren't written.",
      rubric: [
        "Last-write-wins by `updated_at`, and a remote row only replaces a clean (`dirty = 0`), strictly older local row",
        "Pull before push, so local unsent edits are pushed afterwards and end up winning",
        "`changes = 0` means the remote row lost, so its tags mustn't be applied",
        "The cursor is advanced inside the same transaction as the upserts (or: malformed rows are dropped by `parsePullResponse`)",
      ],
      explain:
        "The conflict policy is a single SQL `WHERE`: last-write-wins by `updated_at`, with one override, a row with unsent edits (`dirty = 1`) is never overwritten. Stating the rule in writing is as important as the code, because LWW silently loses data on true concurrent edits.\n\n- **Pull before push:** merge remote first; then push the surviving local edits so the local version ends up newest everywhere.\n- **`changes > 0`:** when the WHERE rejects the update, `changes` is 0, so tags are only written for a remote row that actually won. Otherwise a losing remote row could still replace local tags.\n- **Cursor in the same transaction:** it never moves past rows that were not written.\n- `parsePullResponse` and `sanitizeMood` drop malformed rows rather than poison the database.\n\nIn the tutorial: *Sync semantics to decide* and *M6*.",
      links: [{ title: "SQLite UPSERT", url: "https://www.sqlite.org/lang_upsert.html" }, { title: "MDN: idempotent", url: "https://developer.mozilla.org/en-US/docs/Glossary/Idempotent" }],
    },
    {
      id: "offline-journal-33",
      type: "explain",
      level: 3,
      topics: ["SQLite", "Background Tasks"],
      files: [
        "src/projects/offline-journal/db/client.ts",
        "src/projects/offline-journal/db/init.ts",
        "src/app/projects/offline-journal/_layout.tsx",
      ],
      prompt:
        "The journal database is opened in two ways: `SQLiteProvider`'s `onInit={initDatabase}` and `getDb()` (used by the sync engine and the background task). Open `db/client.ts`. Read `db/client.ts` and `db/init.ts`; note who calls `migrateOnce`. Explain why `migrateOnce()` memoizes a promise at module scope, why it clears that promise on failure, and what could go wrong if both paths ran `migrate()` at the same time.",
      model:
        "With the same name and options, both handles share one native SQLite connection, and the two paths can overlap. For example, `useSyncTriggers` kicks a sync on mount while `onInit` is still running, or a headless task fires. Two concurrent `migrate()` calls would each try to `BEGIN` on the same connection and collide. Even if they didn't, both could run the same version step and fail on `CREATE TABLE … already exists`. expo-sqlite's `withTransactionAsync` isn't exclusive, so nothing else serializes them. Memoizing the promise means whoever arrives first runs the migration and everyone else awaits the same promise. Clearing it on failure stops a rejected promise from being cached forever, so a later call can retry, for example the `DatabaseErrorBoundary`'s \"Try again\". `getDb()` uses the same pattern with `dbPromise`.",
      rubric: [
        "Both paths share one native connection (same name and options) and can overlap in time",
        "Concurrent migrations would collide on BEGIN or apply the same step twice",
        "The memoized promise makes later callers await the first migration instead of starting another",
        "Resetting on failure allows a retry instead of a permanently rejected promise",
      ],
      explain:
        "The sync engine can run before any screen mounts, while `SQLiteProvider`'s `onInit` is still migrating. Both paths share **one native connection** (same name and options), and two concurrent `migrate()` calls would collide on `BEGIN` or run the same step twice (`CREATE TABLE … already exists`). Nothing else serialises them.\n\n- **Design decision:** memoize the promise at module scope so whoever arrives first migrates and everyone else awaits the same promise. A boolean flag is not enough: it lets a second caller proceed before the first finished.\n- **Reset on failure:** a cached rejection would make every later call fail; clearing it lets a retry (the error boundary's \"Try again\") run.\n- `getDb()` repeats the pattern with `dbPromise`, and is lazy so a launch that never touches the journal never opens its database.\n\nIn the tutorial: the \"Two ways in, one connection\" note in *M1*.",
      links: [{ title: "expo-sqlite reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" }],
    },
    {
      id: "offline-journal-34",
      type: "mcq",
      level: 3,
      topics: ["Zustand", "Background Tasks"],
      files: [
        "src/projects/offline-journal/sync/syncEngine.ts",
        "src/projects/offline-journal/stores/settingsStore.ts",
      ],
      prompt:
        "On a headless background launch, `run()` begins with `await ensureSettingsHydrated()` instead of reading `useSettingsStore.getState()`. Read `ensureSettingsHydrated()` in `stores/settingsStore.ts` and the Zustand persist docs on hydration. What would happen if it read `getState()` directly?",
      choices: [
        "The persisted settings might not be loaded from AsyncStorage yet, so `sync.enabled` would read its default `false` and the run would return `skipped: \"disabled\"`",
        "`getState()` throws when called outside a React component",
        "Nothing would change, because `persist` hydrates synchronously at import time",
        "It would read the settings of the other projects' stores",
      ],
      answer: 0,
      explain:
        "Zustand stores work outside React; the trap is that `persist` with AsyncStorage **hydrates asynchronously**. A headless background launch can reach `run()` before hydration finishes, when `sync.enabled` still holds its default `false`. `ensureSettingsHydrated()` checks `persist.hasHydrated()` and otherwise awaits `persist.rehydrate()`.\n\n- **Failure mode:** the task reports \"disabled\" on every cold headless run while Settings says sync is on. The logs are the only clue, which is why the task logs each invocation.\n- **General rule:** any non-React code path that reads persisted state must wait for hydration. The same discipline gates onboarding and the app lock in React.\n\nIn the tutorial: the \"Headless run reads default settings\" failure mode.",
      links: [{ title: "Zustand: persisting store data", url: "https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data.html" }, { title: "expo-task-manager reference", url: "https://docs.expo.dev/versions/latest/sdk/task-manager/" }],
    },
    {
      id: "offline-journal-35",
      type: "explain",
      level: 3,
      topics: ["Background Tasks", "Architecture"],
      files: [
        "src/projects/offline-journal/sync/task.ts",
        "src/app/_layout.tsx",
      ],
      prompt:
        "Open `sync/task.ts` and `src/app/_layout.tsx`. Compare where `task.ts` is imported with where the journal layout is loaded (grep `sync/task`). Explain why `TaskManager.defineTask` is called at module scope inside an `isTaskDefined` guard, why the module is imported from the ROOT layout instead of the journal's layout, and what `minimumInterval: 15` does and doesn't guarantee.",
      model:
        "When the OS runs a background task it may launch the JS bundle headless, with no UI. TaskManager then looks up the task by name, so the definition has to exist as soon as the entry modules are evaluated, not inside a component or effect. A project layout is only evaluated when the user opens that project, so a task defined there would be missing on a headless launch. That's why the root layout has the side-effect import `import \"@/src/projects/offline-journal/sync/task\"`. The `isTaskDefined` guard stops a second definition when the module is evaluated again, for example during development reloads. `minimumInterval` is in minutes and is only a hint: iOS decides when, or whether, to run the task, so the app has to be fully correct if it never runs. Registration only happens when `BackgroundTaskStatus.Available`, and the task reports `Success` or `Failed` based on `result.error`.",
      rubric: [
        "Headless launches look up the task by name, so it must be defined at module evaluation time",
        "Project layouts load only when the project is opened, hence the import from the root layout",
        "The guard prevents defining the task twice",
        "`minimumInterval` is a minimum hint in minutes with no guarantee, and correctness can't depend on it",
      ],
      explain:
        "When the OS runs a background task it may launch the JS bundle **headless**. TaskManager then looks the task up by name, so the definition must exist the moment the entry modules evaluate: at module scope, not in a component or effect. The `isTaskDefined` guard prevents a duplicate definition when the module is evaluated twice (reloads).\n\n- **Why the root layout imports it:** a project layout is only evaluated when the user opens that project, so a task defined there is missing on a headless launch. The repo recorded this bug three times (journal, fitness, podcast).\n- **`minimumInterval: 15`** is a minimum in minutes and a hint; iOS decides when, or whether. Correctness must never depend on it.\n- The task reports `Failed` when `result.error` is set, so the OS can adapt.\n\nIn the tutorial: *Fitting into the launcher* (root-level side effects) and *M6*.",
      links: [{ title: "expo-task-manager reference", url: "https://docs.expo.dev/versions/latest/sdk/task-manager/" }, { title: "expo-background-task reference", url: "https://docs.expo.dev/versions/latest/sdk/background-task/" }, { title: "Apple: BackgroundTasks framework", url: "https://developer.apple.com/documentation/backgroundtasks" }],
    },
    {
      id: "offline-journal-36",
      type: "order",
      level: 3,
      topics: ["Notifications", "Deep Linking", "Expo Router"],
      files: [
        "src/projects/offline-journal/reminders/handlers.ts",
        "src/app/_layout.tsx",
      ],
      prompt:
        "The app is killed. The user taps the daily reminder. Read `startJournalNotificationRouting()` and `open()` in `reminders/handlers.ts`, and where the root layout calls it. Put the journal's cold-start routing steps in order.",
      items: [
        "The root layout module is evaluated and calls `startJournalNotificationRouting()`",
        "Read the tap that launched the app with `Notifications.getLastNotificationResponse()`",
        "Check that `data.url` starts with `/projects/offline-journal/`",
        "Call `clearLastNotificationResponse()` so later launches don't reopen compose",
        "Record `identifier:actionIdentifier` in `handledResponses` to ignore a duplicate delivery",
        "Call `router.push(url)`, which expo-router queues until the root navigator mounts",
      ],
      explain:
        "A cold-start tap opens the **launcher**, so the journal layout never mounts and a listener living there would never see the tap. The router is therefore started from the root layout. The sequence then protects against three problems: read the launching tap with `getLastNotificationResponse()`, validate the URL prefix (payloads are input), record `identifier:actionIdentifier` to drop a duplicate delivery, clear the last response, and push the route.\n\n- **Failure mode of not clearing:** every later launch jumps to compose again.\n- **Failure mode of not de-duplicating:** the same tap can arrive both as the last response and through the listener, opening compose twice.\n- `router.push` before the navigator mounts is queued by expo-router and replayed.\n\nIn the tutorial: *M5 Reminders* and the \"Cold-start tap lost\" failure mode.",
      links: [{ title: "expo-notifications reference", url: "https://docs.expo.dev/versions/latest/sdk/notifications/" }, { title: "Expo Router introduction", url: "https://docs.expo.dev/router/introduction/" }],
    },
    {
      id: "offline-journal-37",
      type: "mcq",
      level: 3,
      topics: ["React Hooks", "Zustand"],
      files: ["src/projects/offline-journal/stores/settingsStore.ts"],
      prompt:
        "`useSettingsHydrated()` is built with `useSyncExternalStore(subscribeHydration, getHydrated, getHydrated)`. Read the comment above `useSettingsHydrated` and the React `useSyncExternalStore` docs. Why not just `return useSettingsStore.persist.hasHydrated()` in the hook body?",
      choices: [
        "A plain call reads the value during render but subscribes to nothing, so the component never re-renders when hydration finishes. `useSyncExternalStore` subscribes through `onFinishHydration` and re-reads the snapshot",
        "`hasHydrated()` is async and can't be called during render",
        "The React Compiler forbids calling any Zustand API during render",
        "`useSyncExternalStore` makes AsyncStorage hydrate synchronously",
      ],
      answer: 0,
      explain:
        "The persist hydration flag lives **outside React**, which is exactly the case `useSyncExternalStore` exists for: a subscribe function plus a synchronous snapshot getter, with no tearing. A plain `return persist.hasHydrated()` reads once during render and subscribes to nothing, so the component never re-renders when hydration finishes.\n\n- **Why not `useState` + `useEffect`:** hydration can finish between render and subscription, so the event is missed, and the React Compiler's lint rule flags setState in an effect body.\n- **Failure mode:** the app lock or onboarding gate stays stuck on the pre-hydration answer until something else re-renders.\n- Reaching for an effect is the last resort; derive, or subscribe with this hook.\n\nIn the tutorial: *M7* and the \"Hydration flash\" failure mode.",
      links: [{ title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" }, { title: "React: You might not need an effect", url: "https://react.dev/learn/you-might-not-need-an-effect" }],
    },
    {
      id: "offline-journal-38",
      type: "multi",
      level: 3,
      topics: ["SQLite", "File System", "Offline & Sync"],
      files: [
        "src/projects/offline-journal/db/queries/entries.ts",
        "src/projects/offline-journal/hooks/useJournalActions.ts",
        "src/projects/offline-journal/utils/attachments.ts",
      ],
      prompt:
        "Open `purgeDeleted()` in `db/queries/entries.ts` and `purge` in `hooks/useJournalActions.ts`, and check the SQLite foreign-key docs on when cascades run. Select all that apply.",
      choices: [
        "By default it hard-deletes only tombstones the server already has: `dirty = 0` and no outbox row for the entry",
        "With `includeUnsynced` (sync off), it also deletes the queued outbox rows for those entries, because there's no server to tell",
        "`entry_tags` and `attachments` rows go with the entry through `ON DELETE CASCADE`, which works only because `migrate()` turned on `PRAGMA foreign_keys`",
        "It deletes the image files first and the rows second, so a crash can never leave orphan files",
        "Afterwards, `sweepOrphans()` deletes any file under `attachments/` that no row references, and `pruneUnusedTags()` removes tags nothing points to",
      ],
      answer: [0, 1, 2, 4],
      explain:
        "Purging has an ordering discipline. Tombstones are hard-deleted only when the server already has them (`dirty = 0`, nothing queued); purging earlier would lose the delete. With `includeUnsynced` (sync off) there is no server to tell, so queued deletes go too.\n\n- **Rows first, files second:** a crash in between leaves harmless orphan files that `sweepOrphans()` removes later. The reverse order could leave rows pointing at missing files (broken images).\n- **Cascades:** `entry_tags` and `attachments` rows disappear via `ON DELETE CASCADE`, which SQLite honours only when `PRAGMA foreign_keys = ON` for that connection, set in `migrate()`.\n- `pruneUnusedTags()` cleans tags nothing references.\n\nIn the tutorial: *M4* (the sweep warning) and the milestone's checkpoint.",
      links: [{ title: "SQLite foreign key support", url: "https://www.sqlite.org/foreignkeys.html" }, { title: "SQLite transactions", url: "https://www.sqlite.org/lang_transaction.html" }, { title: "expo-file-system reference", url: "https://docs.expo.dev/versions/latest/sdk/filesystem/" }],
    },
    {
      id: "offline-journal-39",
      type: "mcq",
      level: 3,
      topics: ["React Compiler", "React Hooks"],
      files: [
        "src/app/projects/offline-journal/entry/compose.tsx",
        "src/projects/offline-journal/hooks/useAttachments.ts",
      ],
      prompt:
        "In `entry/compose.tsx`, the `Editor` keeps the id produced by the first save twice: in `entryId` (a `useRef`) and in `savedId` (`useState`). Read `Editor` in `entry/compose.tsx` and note where `entryId.current` and `savedId` are each read. Why both?",
      choices: [
        "The async save path (`persist`, chained on a promise queue) needs the current id without stale closures, so it uses a ref. `useAttachments(savedId)` needs a re-render when the id first appears, and refs mustn't be read during render under the React Compiler rules, so it uses state",
        "The ref survives the modal closing, while state is reset",
        "Zustand persists the state to AsyncStorage, but not the ref",
        "It's redundant: either one alone would behave the same",
      ],
      answer: 0,
      explain:
        "The two copies serve two different readers. The async save path (`persist`, chained on a promise queue) needs the **current** id without stale closures, so it uses a ref. `useAttachments(savedId)` must **re-render** when the id first appears, and the React Compiler's rules forbid reading `ref.current` during render, so that value is state.\n\n- **Rule of thumb:** render-facing data in state, callback-facing data that must be current in a ref.\n- **Failure mode without the queue:** an autosave and an Attach tap racing before the first insert create two entries. The snapshot comparison against `lastSaved` also skips no-op writes, since each write becomes an outbox op.\n\nIn the tutorial: the compose note in *M2* (\"The compose snippet is condensed\").",
      links: [{ title: "React: useRef", url: "https://react.dev/reference/react/useRef" }, { title: "React Compiler", url: "https://react.dev/learn/react-compiler" }],
    },
    {
      id: "offline-journal-40",
      type: "explain",
      level: 3,
      topics: ["Architecture", "Zustand", "Offline & Sync"],
      files: [
        "src/projects/offline-journal/hooks/useSyncStatus.ts",
        "src/projects/offline-journal/stores/syncStore.ts",
        "src/projects/offline-journal/db/queries/outbox.ts",
      ],
      prompt:
        "The sync status in the UI comes from two places. `useSyncStatus()` reads the pending and dead counts plus `last_synced_at` and `last_error` from SQLite through `useLiveQuery`, while `phase` and `last` come from the Zustand `useSyncStore`. Read `syncStore.ts`'s doc comment and `selectStatus` in `useSyncStatus.ts`. Explain why the state is split this way, and how the non-React sync engine updates the Zustand part.",
      model:
        "Durable facts live in SQLite. They survive restarts and are computed straight from the outbox (`outboxStats()`), so the pending count can never disagree with the queue. A background run that changes the outbox while no screen is mounted is reflected automatically, because `useLiveQuery` watches `outbox` and `sync_meta`. The run phase (`idle`, `syncing`, `error`) and the last result are temporary, in-memory facts that mean nothing after a restart, so a plain non-persisted Zustand store is enough. The engine runs outside React, sometimes headless, and updates the store with `useSyncStore.getState().setPhase()` and `finish()`. Components subscribe with selectors. Copying the counts into Zustand would create a second source of truth that drifts from the outbox.",
      rubric: [
        "Counts and timestamps come from SQLite, so they survive restarts and can't drift from the outbox",
        "`useLiveQuery` on `outbox` and `sync_meta` keeps the UI current even when a background run did the writing",
        "Phase and last result are temporary, in-memory state",
        "The engine writes via `useSyncStore.getState()` outside React, and components read with selectors",
      ],
      explain:
        "Each fact lives in one place, chosen by how long it must live. **Durable** facts (pending and dead counts, last synced time, last error) are in SQLite, so they survive restarts and are computed from the outbox itself; a background run that changes the outbox is reflected automatically because `useLiveQuery` watches `outbox` and `sync_meta`. **Ephemeral** facts (run phase, last result) are meaningless after a restart, so a plain in-memory Zustand store is enough.\n\n- **How the non-React engine updates it:** `useSyncStore.getState().setPhase()` / `finish()`; components subscribe with selectors.\n- **Failure mode of mirroring counts into Zustand:** a second source of truth that drifts from the queue, and a banner that says \"0 pending\" while edits are stuck.\n\nIn the tutorial: *M6* (`syncStore.ts` and the status hooks).",
      links: [{ title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" }],
    },
    {
      id: "offline-journal-42",
      type: "mcq",
      level: 3,
      topics: ["Gesture Handler", "React Hooks"],
      files: [
        "src/projects/offline-journal/components/SwipeToDelete.tsx",
        "src/projects/offline-journal/hooks/useDeleteWithUndo.ts",
        "src/app/projects/offline-journal/(tab)/index.tsx",
      ],
      prompt:
        "`SwipeToDelete` sends both the full swipe (`onSwipeableOpen`) and the Delete button through `commit()`, which returns early once `committedRef.current` is true. The button can be tapped while the open animation is still running. Open `hooks/useDeleteWithUndo.ts`. Trace `remove()` and `flushPending` in `useDeleteWithUndo.ts` for the same id. Without the guard, what would a second `onDelete` for the same row do?",
      choices: [
        "`remove(id)` runs again, and its `flushPending()` commits the first, still-pending delete at once before starting a new window for the same id. The entry is soft-deleted and queued immediately, so Undo can no longer bring it back",
        "Nothing: `remove()` ignores an id that is already `pendingId`",
        "`softDeleteEntry` runs twice in one transaction and the second one throws on the missing row",
        "React batches both calls into one state update, so only one delete is ever scheduled",
      ],
      answer: 0,
      explain:
        "`flushPending` exists so swiping a second row commits the first instead of dropping it. That same rule makes a **duplicate call for the same row** harmful: the second `remove(id)` flushes the delete the user may still want to undo, so it is soft-deleted and queued immediately and Undo can no longer restore it.\n\n- **Why it can happen:** the Delete button is tappable while the open animation is still running, so one gesture can reach both `onSwipeableOpen` and `onPress`.\n- **The guard:** `committedRef` makes `commit()` run once per open and is reset in `onSwipeableClose`. `commit()` also calls `close()`, because FlashList recycles cells and a recycled or restored row would otherwise appear already open with the guard set.\n- A component bug and a hook rule combine here, which is why both files are listed.\n\nIn the tutorial: *M2* (the swipe paragraph).",
      links: [{ title: "Gesture Handler: ReanimatedSwipeable", url: "https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/" }, { title: "React: useRef", url: "https://react.dev/reference/react/useRef" }],
    },
  ],
});
