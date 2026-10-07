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
        "Open `src/app/projects/offline-journal/_layout.tsx` and `src/projects/offline-journal/hooks/useEntries.ts`. How do the journal's screens and hooks get their database handle?",
      choices: [
        "From `useSQLiteContext()`, which returns the handle opened by `<SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase} useSuspense>` in the project layout",
        "Each hook calls `openDatabaseAsync(\"journal.db\")` itself and caches the handle in a `useRef`",
        "From a TanStack Query `useQuery` whose `queryFn` returns the database from `src/shared/providers/QueryProvider.tsx`",
        "From `getDb()` in `db/client.ts`, which every screen awaits inside a `useEffect`",
      ],
      answer: 0,
      explain:
        "The project layout mounts `SQLiteProvider` (wrapped in `Suspense` and a `DatabaseErrorBoundary`), and hooks such as `useSaveEntry` and `useLiveQuery` call `useSQLiteContext()`. `getDb()` exists only for callers that have no React tree: the sync engine and the headless background task. The comment in `db/client.ts` says screens must not use it. The journal doesn't use TanStack Query at all. Its reactive reads come from its own `useLiveQuery`.",
    },
    {
      id: "offline-journal-02",
      type: "text",
      level: 1,
      topics: ["SQLite"],
      files: ["src/projects/offline-journal/db/migrations.ts"],
      prompt:
        "Open `src/projects/offline-journal/db/migrations.ts`. `migrate()` reads a number that SQLite keeps in the database file header, compares it to `SCHEMA_VERSION`, and bumps it after each step. Type the PRAGMA name (you can leave out the word PRAGMA).",
      accept: ["user_version", /^(pragma\s+)?user_version(\s*;)?$/i],
      explain:
        "`PRAGMA user_version` is a free integer slot in the SQLite header, which makes it a natural schema version. `migrate()` reads it with `getFirstAsync`, then for each missing version runs `MIGRATIONS[next]` and writes `PRAGMA user_version = ${next}` in the same transaction. The value is interpolated, not bound, because PRAGMA statements can't take bound parameters. That is safe here because `next` is an integer computed in code.",
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
        "Entry ids are 26-character ULIDs generated on the device (`utils/id.ts`), not server ids or autoincrement integers. Which reason matches how the code actually uses them?",
      choices: [
        "They can be created offline with no server round-trip, they sort by creation time, and they serve as the idempotency key for `PUT /entries/:id`",
        "The server assigns the real id on the first sync. The ULID is a placeholder that `remote_id` later replaces",
        "FTS5 external-content tables need a TEXT primary key, so INTEGER ids would break search",
        "SQLite does not allow random UUIDv4 strings as primary keys",
      ],
      answer: 0,
      explain:
        "The first 10 Crockford base32 characters encode the millisecond timestamp and the last 16 come from `expo-crypto` random bytes (`256 % 32 === 0`, so the mapping has no bias). The sync contract in `syncEngine.ts` says the server upserts on the client ULID, so replaying a request is harmless. `markDone` even sets `remote_id = COALESCE(remote_id, id)`, which means the server never hands out a different id. FTS5 is tied to the implicit `rowid` (`content_rowid = 'rowid'`), not to the TEXT primary key. The time ordering is a convenience, not what the timeline relies on: `listEntries` orders by `created_at` and pages with LIMIT/OFFSET, as the comment in `utils/id.ts` says.",
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
        "Open `db/queries/entries.ts` and look at `softDeleteEntry()`. Deleting an entry never runs `DELETE FROM entries`. Type the column that marks a row as deleted.",
      accept: ["deleted_at", "entries.deleted_at"],
      explain:
        "The V1 schema comment says it directly: \"soft delete; hard deletes break sync\". The row has to stay so the delete can be queued and replayed to the server (`enqueue(db, \"delete\", …)` in the same transaction). Every read filters on `deleted_at IS NULL`, and the partial index `idx_entries_timeline … WHERE deleted_at IS NULL` keeps tombstones out of the timeline index. Rows are hard-deleted only later by `purgeDeleted()`, once the server has the tombstone.",
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
        "`useLiveQuery` re-runs its query when expo-sqlite's `addDatabaseChangeListener` reports a change to one of the watched tables. What has to be true for those events to fire at all?",
      choices: [
        "The database must be opened with `enableChangeListener: true`. Both `SQLiteProvider`'s `options` and `getDb()` pass it",
        "Every write must go through `withTransactionAsync`, because plain `runAsync` writes emit no events",
        "Each table needs a trigger that inserts into a change-log table",
        "The database must be in WAL mode, which `migrate()` turns on",
      ],
      answer: 0,
      explain:
        "Change events are opt-in per connection via `enableChangeListener`. The comment in `db/client.ts` adds a second reason the flag has to match: `SQLiteProvider` and `getDb()` share one native connection only when the name and options are the same. Any write fires events, whether or not it's inside a transaction (one event per changed row, which is why `useLiveQuery` batches them behind a 50 ms timer). WAL has nothing to do with change notifications.",
    },
    {
      id: "offline-journal-06",
      type: "text",
      level: 1,
      topics: ["Gesture Handler", "Reanimated"],
      files: ["src/projects/offline-journal/components/SwipeToDelete.tsx"],
      prompt:
        "Open `components/SwipeToDelete.tsx`. The Delete button is rendered with `renderRightActions`, and a full swipe commits the delete from `onSwipeableOpen(direction)`. Which `SwipeDirection` member triggers the delete? Type `LEFT` or `RIGHT`.",
      accept: ["LEFT", "SwipeDirection.LEFT"],
      hint: "Which way does the row itself move when the right-hand actions are revealed?",
      explain:
        "`ReanimatedSwipeable` reports the direction the row moved, not the side the actions sit on. To reveal the right-hand actions the row slides left, so a full swipe reports `SwipeDirection.LEFT`. The original write-up got this wrong (\"right\"), and `.agents/lessons/_learned.md` records the fix. This is a good reminder to check a library's meaning of \"direction\" instead of guessing.",
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
        "The timeline redirects to onboarding with `if (hydrated && !onboarded) return <Redirect … />`. What would an already-onboarded user see if the `hydrated &&` check were removed?",
      choices: [
        "A redirect to onboarding on every cold start. The store starts from its defaults (`onboarded: false`) until AsyncStorage finishes loading",
        "Nothing changes, because Zustand's `persist` reads AsyncStorage synchronously before the first render",
        "A crash, because `onboarded` is `undefined` until hydration",
        "Onboarding would never appear, even on a fresh install",
      ],
      answer: 0,
      explain:
        "AsyncStorage is asynchronous, so the first render of a persisted Zustand store sees the initial state from `create()`, and `onboarded` defaults to `false`. Without the gate, `<Redirect>` fires before hydration and sends the user to onboarding even though they finished it long ago. `useSettingsHydrated()` reports when hydration is done. `useAppLock` uses the same gate for the lock, as the comment in `settingsStore.ts` points out.",
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
        "Why does `toRows()` in `utils/timeline.ts` build one flat array of `header` and `entry` rows, and why does the timeline pass `getItemType={(row) => row.kind}` to FlashList?",
      choices: [
        "FlashList takes one flat `data` array (no SectionList-style sections). `getItemType` makes header cells recycle with header cells and entry cells with entry cells, and `headerIndices()` supplies `stickyHeaderIndices`",
        "FlashList needs every item to be the same height, so headers are added as fake entries to fill the gaps",
        "`getItemType` sets the accessibility role of each row",
        "Flattening lets SQLite return headers and entries together from a single UNION query",
      ],
      answer: 0,
      explain:
        "FlashList recycles cell views, and reusing an entry card's view for a short day header wastes layout work. `getItemType` keeps a separate recycle pool for each kind. Day headers are inserted in JS from local `dayKey`s, not by SQL, and `timeline.test.ts` checks that every row key is unique, because recycling depends on stable keys. `onEndReached` grows `limit` by `PAGE` only when the previous page came back full.",
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
        "Open `db/migrations.ts` (the V2 block). Type the name of the FTS5 virtual table that indexes entry titles and bodies.",
      accept: ["entries_fts"],
      explain:
        "`CREATE VIRTUAL TABLE entries_fts USING fts5(title, body, content = 'entries', content_rowid = 'rowid')` creates an external-content index. It stores no copy of the text, only tokens that point at `entries.rowid`. `searchEntries()` joins `entries_fts f JOIN entries e ON e.rowid = f.rowid`. Because the index doesn't follow the table on its own, the V2 migration adds the `entries_ai` / `entries_ad` / `entries_au` triggers. V4 later replaces `entries_au` with an `AFTER UPDATE OF title, body` version.",
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
        "In `hooks/useAppLock.ts`, the settings say `biometricLock: true`, but the user has since removed their device passcode and has no biometrics enrolled, so `canAuthenticate()` returns false. What does `authenticate()` do?",
      choices: [
        "Calls `unlock()` and returns true without prompting, so the user is never locked out of their own data",
        "Keeps the journal locked until the user enrolls biometrics again",
        "Falls back to a custom PIN screen backed by expo-secure-store",
        "Calls `LocalAuthentication.authenticateAsync` anyway, which always shows a passcode keypad",
      ],
      answer: 0,
      explain:
        "`canAuthenticate()` returns true when `hasHardwareAsync() && isEnrolledAsync()`, or when `getEnrolledLevelAsync()` is anything other than `SecurityLevel.NONE` (a passcode alone counts). If neither holds, there's nothing to prompt with, so the hook unlocks (\"never brick the user out of their data\"). The Settings screen guards the other direction: `toggleLock` refuses to turn the lock on without an authenticator, and only enables it after a successful `promptAuthentication()`.",
    },
    {
      id: "offline-journal-11",
      type: "text",
      level: 1,
      topics: ["Background Tasks"],
      files: ["src/projects/offline-journal/sync/task.ts"],
      prompt:
        "Open `sync/task.ts`. Type the npm package that provides `registerTaskAsync(SYNC_TASK, { minimumInterval: 15 })`, `getStatusAsync()` and `BackgroundTaskResult`.",
      accept: ["expo-background-task", /^expo[-\s]?background[-\s]?task$/i],
      explain:
        "The journal uses `expo-background-task` (the replacement for the older `expo-background-fetch`) to schedule the work, and `expo-task-manager` to define what the task does. `registerSyncTask()` first checks `getStatusAsync() === BackgroundTaskStatus.Available` and quietly returns false in Expo Go or on the web. `minimumInterval` is in minutes and is only a hint to the OS.",
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
        "`saveEntry()` upserts the entry row and calls `enqueue()` inside one `db.withTransactionAsync`. What is the main reason?",
      choices: [
        "The row change and its outbox item commit together or not at all, so the queue can never disagree with the data it is meant to ship",
        "It makes `addDatabaseChangeListener` fire a single event for the whole save",
        "`enqueue()` would otherwise open its own nested transaction and fail",
        "SQLite only allows `ON CONFLICT … DO UPDATE` inside an explicit transaction",
      ],
      answer: 0,
      explain:
        "This is the central offline-first technique, the transactional outbox. If the app dies between the two writes, either both survived or neither did, so you can never end up with a saved edit that never syncs, or an outbox item for a row that doesn't exist. Change events still fire once per changed row (`useLiveQuery` batches them). `enqueue()` deliberately opens no transaction of its own: its doc comment says it must run inside the caller's.",
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
        "Put the steps of `migrate()` in `db/migrations.ts` in the order they run when upgrading an older database.",
      items: [
        "Run the connection PRAGMAs (`journal_mode = WAL`, `foreign_keys = ON`) outside any transaction",
        "Read the current `PRAGMA user_version`",
        "Open a transaction for the next missing version with `withTransactionAsync`",
        "Execute that version's SQL from `MIGRATIONS[next]`",
        "Set `PRAGMA user_version = next` inside the same transaction",
        "Let the transaction commit, then loop until `version === SCHEMA_VERSION`",
      ],
      explain:
        "`journal_mode` can't change inside a transaction, so the PRAGMAs run first. WAL lets readers proceed while the writer works, and `foreign_keys` is a per-connection setting that `ON DELETE CASCADE` depends on. Each version gets its own transaction with the version bump inside it, so a crash mid-upgrade leaves `user_version` matching the schema that actually exists. V3 shows the safe way to evolve a schema: `ALTER TABLE … ADD COLUMN` changes the table in place, and existing rows get NULL or the default. V4 shows how to change something already shipped: a device that ran V2 never runs it again, so the trigger is replaced by a new step (`DROP TRIGGER` + `CREATE TRIGGER`) instead of by editing V2.",
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
        "Open the V2 and V4 migrations and `rebuildSearchIndex()` in `db/migrations.ts`. Select all that apply.",
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
        "An external-content FTS5 table must be told about every change. Deletes use the special `INSERT INTO entries_fts(entries_fts, rowid, …) VALUES('delete', …)` form with the old values, and updates do a delete followed by an insert. V2 shipped `entries_au` as plain `AFTER UPDATE ON entries`, so every sync bookkeeping write (`dirty`, `remote_id`, a soft delete) deleted and re-inserted the row in the index for nothing. The index only covers `title` and `body`, so V4 drops the trigger and recreates it as `AFTER UPDATE OF title, body`. It is a new step because devices that already ran V2 never run it again; editing V2 would change nothing for them. `migrations.test.ts` measures this with `total_changes()`: a `dirty` flip is exactly one row write. A soft delete is an UPDATE of `deleted_at`, so the row stays in the index and `searchEntries()` hides it with `e.deleted_at IS NULL`. Old rows only get indexed by the backfill or by `'rebuild'`. WAL plays no part in any of this.",
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
        "Open `toMatchQuery()` in `db/queries/search.ts`. What does this return?",
      code: "toMatchQuery('say \"hi\" -x OR')",
      choices: [
        "`\"say\"* \"\"\"hi\"\"\"* \"-x\"* \"OR\"*`",
        "`say \"hi\" -x OR`, passed through unchanged so FTS5 can apply its NOT and OR operators",
        "`say* hi* x*`, with punctuation and operators stripped",
        "`\"say hi x\"*`, a single prefix phrase",
      ],
      answer: 0,
      explain:
        "FTS5 `MATCH` takes a query language, not plain text. A stray quote or a bare `-` is a syntax error, and `OR` is an operator. Wrapping every whitespace-separated word in quotes (with inner quotes doubled) makes each one a literal string, and the trailing `*` turns it into a prefix search so typing \"syn\" finds \"sync\". `text.test.ts` asserts this exact output. Whitespace-only input becomes `\"\"`, and `searchEntries()` then falls back to the filter-only query or returns `[]`.",
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
        "Open `mergeOutboxOp()` in `sync/policy.ts`. Predict the three results in order and type them comma-separated (for example `a, b, c`).",
      code: 'mergeOutboxOp("create", "update")\nmergeOutboxOp("update", "delete")\nmergeOutboxOp("delete", "update")',
      accept: [/^create\s*,\s*delete\s*,\s*update$/i],
      explain:
        "The rule is \"what does the server need to end up correct?\". create + update stays `create`, because the server never saw the row and should get the latest body. Any op followed by delete becomes `delete`. delete followed by a re-save becomes the new op, which covers an undo that saved the row again. Since the server upserts on `PUT /entries/:id`, sending `update` for a row the server never saw is still correct. Compaction exists because autosave writes about every 800 ms, and sending each pause as its own request would be wasteful.",
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
        "Open `backoffDelay()` in `sync/policy.ts`. Type the value, in milliseconds, that this call returns.",
      code: "backoffDelay(3, () => 0)",
      accept: ["8000", /^8[,_\s]?000(\s*ms)?$/i],
      explain:
        "`min(2 ** attempts * 1000, 300_000)` gives 8,000 ms for 3 attempts, plus `floor(random() * 1000)` of jitter, which is 0 here. The jitter keeps devices that went offline together from retrying in lockstep forever. `failItem()` passes the already-incremented attempt count and writes `next_attempt_at = now + delay`. `claimBatch()` skips rows still inside that window, and rows with `attempts >= MAX_ATTEMPTS` (6) are dead letters.",
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
        "Select all HTTP statuses for which `classifyStatus()` in `sync/policy.ts` returns `\"retry\"`.",
      choices: ["408", "429", "404", "422", "503", "0 (no real HTTP status)"],
      answer: [0, 1, 4, 5],
      explain:
        "2xx is `ok`. 408 (timeout) and 429 (rate limit) are transient, so they retry. Every other 4xx is `dead`: the server will never accept that payload, so `push()` calls `failItem(…, { permanent: true })`, which jumps straight to `MAX_ATTEMPTS`. Everything else, including 5xx and odd values like 0, falls through to `retry`, which `policy.test.ts` checks. A thrown network error never reaches `classifyStatus`. `push()` catches it and calls a plain `failItem`, so the item stays queued.",
    },
    {
      id: "offline-journal-19",
      type: "order",
      level: 2,
      topics: ["Offline & Sync"],
      files: ["src/projects/offline-journal/sync/syncEngine.ts"],
      prompt:
        "Put the steps of one successful `run()` in `sync/syncEngine.ts` in order.",
      items: [
        "`ensureSettingsHydrated()`, returning `skipped: \"disabled\"` if sync is off or has no base URL",
        "`Network.getNetworkStateAsync()`, returning `skipped: \"offline\"` only if reachability is explicitly false",
        "`getDb()`, which opens and migrates the database if no screen has done it yet",
        "Set the sync store's phase to `\"syncing\"`",
        "`pull()`: fetch `/entries?since=<cursor>` and upsert the remote rows in one transaction",
        "`push()` the claimed outbox batch, then write `last_synced_at` and delete `last_error`",
      ],
      explain:
        "The cheap checks come first, so the run doesn't use up a backoff step on every item when it already knows there's no route. `undefined` reachability means \"unknown\", so it still tries. `getDb()` comes before any SQL because a headless background launch may arrive before `SQLiteProvider`'s `onInit` has ever run. The run pulls before it pushes (\"remote first, so unsent local edits win\"). Any error is saved to `sync_meta.last_error` and reported through `finish()` without crashing, because the outbox still holds every change.",
    },
    {
      id: "offline-journal-20",
      type: "mcq",
      level: 2,
      topics: ["Offline & Sync", "Architecture"],
      files: ["src/projects/offline-journal/sync/syncEngine.ts"],
      prompt:
        "A sync run is in progress. The user taps \"Sync now\", which calls `kick()`, twice more. What happens?",
      choices: [
        "Both calls get the in-flight promise back and `again` is set, so exactly one follow-up run starts once the current run finishes",
        "Two more runs start in parallel, each claiming its own batch from the outbox",
        "Both calls are ignored, and the user has to tap again after the run ends",
        "The current run is aborted and restarted with fresh settings",
      ],
      answer: 0,
      explain:
        "`kick()` is a run-lock with one queued follow-up. The foreground, network-regained, manual, local-write and background-task triggers all go through it. Without the lock, two runs would claim and push the same outbox row twice. The single follow-up makes sure an edit made during a run isn't left waiting for the next trigger. `kick()` also clears any pending `kickSoon()` timer, since every run ships the whole outbox anyway.",
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
        "Open `useSyncTriggers()` in `hooks/useSyncStatus.ts` and `useSaveEntry()` in `hooks/useEntries.ts`. With sync enabled, which of these start a sync run? Select all that apply.",
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
        "`useSyncTriggers` is mounted once, in the project layout, so the listeners aren't duplicated. It kicks on mount, on `AppState` becoming `active`, and on network events, but only on the transition from `reachable === false` to reachable (edge-triggered). It also registers the background task. Local writes call `kickSoon()`, a 10-second trailing debounce, because the outbox already holds the change durably and there's no rush. Turning sync off unregisters the task.",
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
        "Biometric lock is on with **Lock after: 1 min** (`lockAfterMs: 60000`). The user opens the app switcher, waits 10 seconds and returns to the journal. What happens?",
      choices: [
        "The journal is covered, without a prompt, as soon as the app goes `inactive`. On return the cover lifts and no Face ID prompt appears, because 10 s is inside the grace period",
        "Nothing is covered in the switcher, because the grace period hasn't elapsed",
        "The journal locks immediately and asks for Face ID on return, because `inactive` always locks",
        "The whole Stack unmounts while covered, so the user comes back to the timeline root",
      ],
      answer: 0,
      explain:
        "`useAppLock` calls `setObscured(true)` on any non-active state, because `inactive` is the moment the OS takes the app-switcher snapshot. It records `leftAt` and, on `active`, calls `lock()` only if `Date.now() - leftAt >= graceMs`. `LockGate` keeps rendering the children and places an opaque cover on top instead of unmounting them, so navigation state survives. It hides the content from VoiceOver while covered and doesn't prompt while merely obscured.",
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
        "Open `reminders/scheduleReminder.ts`, `reminders/handlers.ts` and `src/app/_layout.tsx`. Select all that apply.",
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
        "Rescheduling is `cancelDailyReminder()` followed by `scheduleNotificationAsync` with the same identifier and a `DAILY` trigger, so changing the time never stacks reminders. The root only starts listening. Permission is requested after the app shows its own explanation (onboarding slide or Settings alert), because the system prompt can only be shown once. `journalUrl()` follows only URLs that start with `/projects/offline-journal/`, because notification data is untrusted input and the store routes its own pushes.",
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
        "In the compose screen, the user types one character and swipes the modal closed 300 ms later, before the 800 ms debounce fires. Open `hooks/useAutosave.ts`. Is the character saved?",
      choices: [
        "Yes. The unmount cleanup `useEffect(() => () => void flush(), [flush])` saves the latest value, because `dirty` is still true",
        "No. The pending `setTimeout` is cleared on unmount, so the keystroke is lost",
        "Yes, but only because the AppState changes to `background` when a modal closes",
        "No. `skipFirst` skips the first change after mount",
      ],
      answer: 0,
      explain:
        "The debounce effect's cleanup does clear the timer, but a separate effect calls `flush()` on unmount. `flush()` reads `latest.current`, which an effect keeps updated, so it saves the newest value instead of a stale closure. `skipFirst` only skips the effect's run at mount, when the user hasn't touched anything yet. The AppState listener covers a different case: switching apps with the modal still open.",
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
        "Open `hooks/useDeleteWithUndo.ts` and the timeline screen. Swiping hides the row immediately, but `commitDelete` (soft delete + outbox) only runs after a 4 s undo window. Explain why the hook delays the database write instead of soft-deleting at once and reverting on Undo, and what `flushPending` protects against.",
      model:
        "Holding the write back makes Undo free: the screen filters `pendingId` out of the rows, so cancelling just clears the timer and nothing touches SQLite or the outbox. Deleting immediately would queue a delete and then a re-save, and if a sync ran in between, the server would actually see the delete. The hook takes a `commitDelete` function rather than a db handle, so it doesn't care what \"delete\" means. `flushPending` commits the waiting delete right away when a second row is swiped and when the screen unmounts, so a delete the user asked for is never silently dropped. The cost is that the delete isn't durable until the window closes or a flush happens: if the app is killed within those 4 seconds the entry comes back, which is the safe way to fail.",
      rubric: [
        "Undo before commit is free: no SQLite write and no outbox churn, the row is only filtered out by `pendingId`",
        "Committing immediately would enqueue a delete plus a re-save, and a sync in between would replicate the delete",
        "`flushPending` commits the earlier pending delete on a second swipe and on unmount",
        "Names the trade-off: the delete isn't durable during the window (killing the app brings the entry back)",
      ],
      explain:
        "The optimistic part is purely in the UI (`entries.filter(e => e.id !== pendingId)`). Durability starts only when `commitRef.current(id)` runs. Refs hold the timer and the pending id so the unmount cleanup sees current values without re-running the effect on every change.",
    },
    {
      id: "offline-journal-26",
      type: "text",
      level: 2,
      topics: ["Zustand"],
      files: ["src/projects/offline-journal/stores/settingsStore.ts"],
      prompt:
        "Open `stores/settingsStore.ts`. A future release adds a new key to the default `sync` object. Users upgrading from the old release have a saved `sync` object without that key. Type the name of the `persist` option this store overrides so the new nested default isn't wiped out by the saved object.",
      accept: ["merge"],
      explain:
        "The default persist merge is shallow, `{ ...current, ...persisted }`, so a saved `sync` object replaces the whole default `sync` and any newly added nested key disappears. The custom `merge` spreads `current.reminder` and `current.sync` under the saved values. Two related options sit next to it: `partialize` removes the `patch`/`patchSync` functions from what gets written, and `version: 1` leaves room for a later `migrate`.",
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
        "Look through `src/projects/offline-journal/__tests__/` and `testing/nodeDatabase.ts`. Which design choices let these modules be unit-tested under Jest without native modules? Select all that apply.",
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
        "The pattern is to keep each side effect behind a seam. Pure functions take their clock and randomness as parameters, and `policy.ts` holds every sync decision without touching the db or the network. For the SQL, the seam is the db handle: queries never open a database themselves, so `openTestDatabase()` (an expo-sqlite-shaped adapter over `node:sqlite`, in memory) runs the real migrations, FTS5 triggers and outbox queries. expo-sqlite itself is a native module and does not run under Jest. `syncEngine.ts` was not refactored: `syncEngine.test.ts` uses `jest.mock` at the module edges (`getDb`, `request` in `sync/http.ts`, `expo-network`, the settings store) and drives the real `kick()`, so the conflict rule, compare-and-delete and the run-lock are all exercised. Assertions are on database state and requests sent, not on the mocks.",
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
        "Put the steps of `attachImage()` in `utils/attachments.ts` in order.",
      items: [
        "Pick an image with expo-image-picker (asking for camera permission first when the source is the camera)",
        "Downscale to at most 1600 px wide with expo-image-manipulator and save as JPEG",
        "Render a 320 px thumbnail from the saved image",
        "Generate a blurhash from the thumbnail (a failure gives null instead of an error)",
        "Copy both files from the cache into `Paths.document` under `attachments/`",
        "Insert the `attachments` row with paths relative to the document directory",
      ],
      explain:
        "The picker and the manipulator both return cache URIs that the OS can delete, so the files are copied into `Paths.document` before anything refers to them. The row stores relative paths (`attachments/<ulid>.jpg`) because the absolute iOS container path changes across app updates. `resolveAttachmentUri()` rebuilds the full path at read time. Deletes run the other way, row first and file second, and `sweepOrphans()` cleans up any file left behind by a crash in between.",
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
        "Open `hooks/useLiveQuery.ts`. The listener drops an event unless `basename(event.databaseFilePath)` equals `basename(db.databasePath)`, before it even looks at `tableName`. Why check the file at all, and why compare basenames instead of full paths?",
      choices: [
        "`addDatabaseChangeListener` is process-global: every database opened with `enableChangeListener` (fitness's too) reports through it, so table names alone would misfire the day another project adds a table with a journal table's name. SQLite reports the path it resolved, which need not equal the one that was passed in (on iOS `/private/var/…` for `/var/…`)",
        "The listener is per handle, but `SQLiteProvider` and `getDb()` are two handles, so the file check stops each from refreshing the other's queries",
        "`tableName` is empty for writes made inside a transaction, so the file is the only field that is always set",
        "The native layer already compares full paths; the basename check only strips the `file://` scheme",
      ],
      answer: 0,
      explain:
        "The event carries `databaseName` (`main` unless you ATTACH), `databaseFilePath`, `tableName` and `rowId`, and it fires for every connection that opted in. Today no other project has an `entries`, `tags` or `outbox` table, so the table check alone happens to work; the file check makes it correct by construction instead of by naming luck. Exact path equality is fragile because the path in the event comes from SQLite (`sqlite3_db_filename`), not from the string JS passed to `openDatabaseAsync`. A basename such as `journal.db` is unique per project here. Sharing one connection between `SQLiteProvider` and `getDb()` is the reason both must pass the same options, not something this check is about.",
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
        "The Settings screen reads the store with `useSettingsStore(useShallow((s) => ({ theme: s.theme, …, sync: s.sync })))`, and the actions with separate `useSettingsStore((s) => s.patch)` selectors, instead of a bare `useSettingsStore()`. Select all that apply.",
      choices: [
        "The screen re-renders only when one of the picked fields changes. A bare `useSettingsStore()` subscribes to the whole state, so any write, such as `patch({ onboarded: false })` or a field added later, re-renders it",
        "Without `useShallow`, the inline object selector would return a new object on every call. Zustand v5 would see a changed snapshot each time and the render loop would never settle",
        "`useShallow` compares deeply, so `patchSync({ baseUrl })` does not re-render the screen",
        "It stops the `persist` middleware from writing unchanged fields to AsyncStorage",
        "`patch` and `patchSync` are created once in `create()` and never change, so plain selectors for them never trigger a render",
      ],
      answer: [0, 1, 4],
      explain:
        "A selector decides what a component subscribes to. `useShallow` compares the returned object one level deep, so an unchanged selection counts as the same snapshot. That one level is the point: `patchSync` builds a new `sync` object (`{ ...state.sync, ...partial }`), so a sync change still re-renders the screen, as it should. Persistence is unaffected; `partialize` decides what is written. On this screen the gain is small, since it renders almost every field, but the selector keeps it from growing as the store grows.",
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
        "`enqueue()` only folds a new op into an existing outbox row `WHERE entity_id = ? AND attempts = 0`. Why not fold into any waiting row for that entity?",
      choices: [
        "A row that has been attempted may already have reached the server (its response may have been lost), so a newer op has to be sent after it as a separate item to keep the order correct",
        "Rows with `attempts > 0` are dead letters about to be deleted",
        "SQLite can't UPDATE a row that another transaction has read",
        "Folding into an attempted row would reset its backoff, which breaks the server's rate limit",
      ],
      answer: 0,
      explain:
        "Once an item has gone out on the wire, you can't know what the server applied. Rewriting that row could reorder operations: an edit folded into an attempted delete, for example, would never send the delete the server may have half-processed. There's a subtlety here: a row being pushed for the first time still has `attempts = 0`, because attempts only go up on failure. So a fold can land on an in-flight row, which is exactly what `completeItem()` protects against.",
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
        "Open `db/queries/outbox.ts`. `completeItem()` runs `DELETE FROM outbox WHERE id = ? AND payload = ?` rather than just `WHERE id = ?`. Describe the exact sequence of events this guards against, and what would be lost without it.",
      model:
        "`push()` claims an item and sends its PUT. While the request is in flight the row still has `attempts = 0`, because attempts only increase on failure. If autosave writes a newer edit during that time, `enqueue()` finds the same row and folds the new op and payload into it. When the first PUT comes back 2xx, deleting by id alone would remove the row that now carries the newer, unsent edit, so the server would never receive it. `markDone` would then also clear `dirty`, because no outbox row is left, and that drops the pull's protection for the local edit. With the payload check the DELETE affects 0 rows, the newer payload stays queued for the next run, and `markDone`'s `NOT EXISTS` guard keeps `dirty = 1`.",
      rubric: [
        "An in-flight item still has `attempts = 0`, so `enqueue()` can fold a newer edit into it",
        "Deleting by id alone would drop that newer edit, which then never reaches the server",
        "With the payload check the delete matches 0 rows and the edit ships on the next run",
        "Mentions the knock-on effect on `dirty` and `markDone`'s `NOT EXISTS` guard",
      ],
      explain:
        "This is optimistic concurrency done with a compare-and-delete: the payload acts as the version. The same idea appears wherever a queue item can change while a worker holds it. `syncEngine.test.ts` reproduces the exact sequence (\"keeps an edit made while its request was in flight\") and fails if the `payload = ?` check is dropped.",
    },
    {
      id: "offline-journal-31",
      type: "mcq",
      level: 3,
      topics: ["Offline & Sync", "SQLite"],
      files: ["src/projects/offline-journal/sync/syncEngine.ts"],
      prompt:
        "`markDone()` clears the dirty flag with `UPDATE entries SET dirty = 0, … WHERE id = ? AND NOT EXISTS (SELECT 1 FROM outbox WHERE entity_id = ?)`. What would break if the `NOT EXISTS` clause were removed?",
      choices: [
        "A row that still has a newer queued edit would be marked clean (`dirty = 0`), so the pull's conflict guard would stop protecting it, and a remote version with a later `updated_at` could overwrite the unsent local edit",
        "The outbox row would never be deleted, so it would be pushed forever",
        "`remote_id` would be set to NULL on every push",
        "Nothing important: `dirty` is only cosmetic and is read by `SyncBanner`",
      ],
      answer: 0,
      explain:
        "`dirty = 1` means \"this row has local changes the server hasn't confirmed yet\". `pull()`'s upsert only overwrites rows with `entries.dirty = 0`, and `purgeDeleted()` also requires `dirty = 0`. Clearing the flag while an item for the same entity is still queued would expose an unsent edit to remote overwrites. `SyncBanner` gets its counts from the outbox via `outboxStats()`, not from `dirty`.",
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
        "Open `pull()` in `sync/syncEngine.ts`. Explain the conflict policy in the upsert's `WHERE entries.dirty = 0 AND entries.updated_at < excluded.updated_at`, why `run()` pulls before it pushes, and why tags are only written when `result.changes > 0`.",
      model:
        "The policy is last-write-wins by `updated_at`, with one override: a local row with unsent edits (`dirty = 1`) is never overwritten by a pull. A remote row wins only if the local copy is clean and strictly older, so equal timestamps leave the local row alone. Pulling first merges remote changes before pushing. The push then sends the local edits that survived, the server upserts them on the ULID, and the local version becomes the newest everywhere (\"remote first, so unsent local edits win\"). When the WHERE rejects the update, `runAsync` reports `changes = 0`, so tags are only rewritten for a remote row that actually won. Otherwise a losing remote row could still replace the local tags. The cursor (`last_pulled_at = serverTime`) is saved in the same transaction, so it never moves past rows that weren't written.",
      rubric: [
        "Last-write-wins by `updated_at`, and a remote row only replaces a clean (`dirty = 0`), strictly older local row",
        "Pull before push, so local unsent edits are pushed afterwards and end up winning",
        "`changes = 0` means the remote row lost, so its tags mustn't be applied",
        "The cursor is advanced inside the same transaction as the upserts (or: malformed rows are dropped by `parsePullResponse`)",
      ],
      explain:
        "Conflict resolution here is one SQL WHERE clause. Stating the rule explicitly (the comment at the top of `syncEngine.ts`) is as important as the code. `parsePullResponse` and `sanitizeMood` make sure only well-formed values ever reach that upsert.",
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
        "The journal database is opened in two ways: `SQLiteProvider`'s `onInit={initDatabase}` and `getDb()` (used by the sync engine and the background task). Open `db/client.ts`. Explain why `migrateOnce()` memoizes a promise at module scope, why it clears that promise on failure, and what could go wrong if both paths ran `migrate()` at the same time.",
      model:
        "With the same name and options, both handles share one native SQLite connection, and the two paths can overlap. For example, `useSyncTriggers` kicks a sync on mount while `onInit` is still running, or a headless task fires. Two concurrent `migrate()` calls would each try to `BEGIN` on the same connection and collide. Even if they didn't, both could run the same version step and fail on `CREATE TABLE … already exists`. expo-sqlite's `withTransactionAsync` isn't exclusive, so nothing else serializes them. Memoizing the promise means whoever arrives first runs the migration and everyone else awaits the same promise. Clearing it on failure stops a rejected promise from being cached forever, so a later call can retry, for example the `DatabaseErrorBoundary`'s \"Try again\". `getDb()` uses the same pattern with `dbPromise`.",
      rubric: [
        "Both paths share one native connection (same name and options) and can overlap in time",
        "Concurrent migrations would collide on BEGIN or apply the same step twice",
        "The memoized promise makes later callers await the first migration instead of starting another",
        "Resetting on failure allows a retry instead of a permanently rejected promise",
      ],
      explain:
        "Module-scope promise memoization is the usual way to run something once when the callers aren't coordinated. A `boolean` flag isn't enough, because it would let a second caller continue before the first migration finished.",
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
        "On a headless background launch, `run()` begins with `await ensureSettingsHydrated()` instead of reading `useSettingsStore.getState()`. What would happen if it read `getState()` directly?",
      choices: [
        "The persisted settings might not be loaded from AsyncStorage yet, so `sync.enabled` would read its default `false` and the run would return `skipped: \"disabled\"`",
        "`getState()` throws when called outside a React component",
        "Nothing would change, because `persist` hydrates synchronously at import time",
        "It would read the settings of the other projects' stores",
      ],
      answer: 0,
      explain:
        "Zustand stores work fine outside React. The catch is that `persist` with AsyncStorage hydrates asynchronously. `ensureSettingsHydrated()` checks `persist.hasHydrated()` and otherwise awaits `persist.rehydrate()`. Without it, the background task would skip every time on a cold headless start, and the only symptom would be logs showing \"disabled\" while Settings says sync is on.",
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
        "Open `sync/task.ts` and `src/app/_layout.tsx`. Explain why `TaskManager.defineTask` is called at module scope inside an `isTaskDefined` guard, why the module is imported from the ROOT layout instead of the journal's layout, and what `minimumInterval: 15` does and doesn't guarantee.",
      model:
        "When the OS runs a background task it may launch the JS bundle headless, with no UI. TaskManager then looks up the task by name, so the definition has to exist as soon as the entry modules are evaluated, not inside a component or effect. A project layout is only evaluated when the user opens that project, so a task defined there would be missing on a headless launch. That's why the root layout has the side-effect import `import \"@/src/projects/offline-journal/sync/task\"`. The `isTaskDefined` guard stops a second definition when the module is evaluated again, for example during development reloads. `minimumInterval` is in minutes and is only a hint: iOS decides when, or whether, to run the task, so the app has to be fully correct if it never runs. Registration only happens when `BackgroundTaskStatus.Available`, and the task reports `Success` or `Failed` based on `result.error`.",
      rubric: [
        "Headless launches look up the task by name, so it must be defined at module evaluation time",
        "Project layouts load only when the project is opened, hence the import from the root layout",
        "The guard prevents defining the task twice",
        "`minimumInterval` is a minimum hint in minutes with no guarantee, and correctness can't depend on it",
      ],
      explain:
        "`.agents/lessons/_learned.md` records this bug three times (journal, fitness, podcast). Every `defineTask` in the repo is now imported from `src/app/_layout.tsx`.",
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
        "The app is killed. The user taps the daily reminder. Put the journal's cold-start routing steps in order.",
      items: [
        "The root layout module is evaluated and calls `startJournalNotificationRouting()`",
        "Read the tap that launched the app with `Notifications.getLastNotificationResponse()`",
        "Check that `data.url` starts with `/projects/offline-journal/`",
        "Call `clearLastNotificationResponse()` so later launches don't reopen compose",
        "Record `identifier:actionIdentifier` in `handledResponses` to ignore a duplicate delivery",
        "Call `router.push(url)`, which expo-router queues until the root navigator mounts",
      ],
      explain:
        "A cold-start tap opens the launcher, so the journal layout never mounts. That's why the router is started from the root. The same tap can arrive both as the last response and through `addNotificationResponseReceivedListener`, so `open()` drops duplicates. Clearing the last response matters: otherwise every later launch would jump to compose again. `getLastNotificationResponse()` is synchronous in current SDKs, as the lessons file notes.",
    },
    {
      id: "offline-journal-37",
      type: "mcq",
      level: 3,
      topics: ["React Hooks", "Zustand"],
      files: ["src/projects/offline-journal/stores/settingsStore.ts"],
      prompt:
        "`useSettingsHydrated()` is built with `useSyncExternalStore(subscribeHydration, getHydrated, getHydrated)`. Why not just `return useSettingsStore.persist.hasHydrated()` in the hook body?",
      choices: [
        "A plain call reads the value during render but subscribes to nothing, so the component never re-renders when hydration finishes. `useSyncExternalStore` subscribes through `onFinishHydration` and re-reads the snapshot",
        "`hasHydrated()` is async and can't be called during render",
        "The React Compiler forbids calling any Zustand API during render",
        "`useSyncExternalStore` makes AsyncStorage hydrate synchronously",
      ],
      answer: 0,
      explain:
        "Persist hydration status lives outside React, which is exactly the case `useSyncExternalStore` is built for: subscribe plus a synchronous snapshot getter, with no tearing. The comment also rules out `useState` plus an effect, since hydration could finish between the render and the subscription and the event would be missed. The lessons file records the earlier bug, a hook that called `hasHydrated()` directly and never updated.",
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
        "Open `purgeDeleted()` in `db/queries/entries.ts` and `purge` in `hooks/useJournalActions.ts`. Select all that apply.",
      choices: [
        "By default it hard-deletes only tombstones the server already has: `dirty = 0` and no outbox row for the entry",
        "With `includeUnsynced` (sync off), it also deletes the queued outbox rows for those entries, because there's no server to tell",
        "`entry_tags` and `attachments` rows go with the entry through `ON DELETE CASCADE`, which works only because `migrate()` turned on `PRAGMA foreign_keys`",
        "It deletes the image files first and the rows second, so a crash can never leave orphan files",
        "Afterwards, `sweepOrphans()` deletes any file under `attachments/` that no row references, and `pruneUnusedTags()` removes tags nothing points to",
      ],
      answer: [0, 1, 2, 4],
      explain:
        "Purging a tombstone before the server has it would lose the delete, so the default only removes rows that are already synced. The order is rows first (in a transaction), then files. A crash in between leaves orphan files, which is harmless and gets swept later, and never leaves rows pointing at missing files. SQLite ignores `REFERENCES … ON DELETE CASCADE` unless `foreign_keys` is ON for that connection, which is why `migrate()` sets it.",
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
        "In `entry/compose.tsx`, the `Editor` keeps the id produced by the first save twice: in `entryId` (a `useRef`) and in `savedId` (`useState`). Why both?",
      choices: [
        "The async save path (`persist`, chained on a promise queue) needs the current id without stale closures, so it uses a ref. `useAttachments(savedId)` needs a re-render when the id first appears, and refs mustn't be read during render under the React Compiler rules, so it uses state",
        "The ref survives the modal closing, while state is reset",
        "Zustand persists the state to AsyncStorage, but not the ref",
        "It's redundant: either one alone would behave the same",
      ],
      answer: 0,
      explain:
        "Changing a ref doesn't trigger a render, and reading `ref.current` during render is something the React Compiler flags. So render-facing data goes in state, and callback-facing data that has to be current goes in a ref. The same `Editor` chains saves on `queue.current` so an autosave and an Attach tap can't both insert before the first id exists, which would create two entries. It also skips writes whose JSON snapshot equals `lastSaved`, because every write becomes an outbox op.",
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
        "The sync status in the UI comes from two places. `useSyncStatus()` reads the pending and dead counts plus `last_synced_at` and `last_error` from SQLite through `useLiveQuery`, while `phase` and `last` come from the Zustand `useSyncStore`. Explain why the state is split this way, and how the non-React sync engine updates the Zustand part.",
      model:
        "Durable facts live in SQLite. They survive restarts and are computed straight from the outbox (`outboxStats()`), so the pending count can never disagree with the queue. A background run that changes the outbox while no screen is mounted is reflected automatically, because `useLiveQuery` watches `outbox` and `sync_meta`. The run phase (`idle`, `syncing`, `error`) and the last result are temporary, in-memory facts that mean nothing after a restart, so a plain non-persisted Zustand store is enough. The engine runs outside React, sometimes headless, and updates the store with `useSyncStore.getState().setPhase()` and `finish()`. Components subscribe with selectors. Copying the counts into Zustand would create a second source of truth that drifts from the outbox.",
      rubric: [
        "Counts and timestamps come from SQLite, so they survive restarts and can't drift from the outbox",
        "`useLiveQuery` on `outbox` and `sync_meta` keeps the UI current even when a background run did the writing",
        "Phase and last result are temporary, in-memory state",
        "The engine writes via `useSyncStore.getState()` outside React, and components read with selectors",
      ],
      explain:
        "A useful rule of thumb: keep each fact in one place, and choose that place by how long the fact has to live. `syncStore.ts`'s doc comment states exactly this split.",
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
        "`SwipeToDelete` sends both the full swipe (`onSwipeableOpen`) and the Delete button through `commit()`, which returns early once `committedRef.current` is true. The button can be tapped while the open animation is still running. Open `hooks/useDeleteWithUndo.ts`. Without the guard, what would a second `onDelete` for the same row do?",
      choices: [
        "`remove(id)` runs again, and its `flushPending()` commits the first, still-pending delete at once before starting a new window for the same id. The entry is soft-deleted and queued immediately, so Undo can no longer bring it back",
        "Nothing: `remove()` ignores an id that is already `pendingId`",
        "`softDeleteEntry` runs twice in one transaction and the second one throws on the missing row",
        "React batches both calls into one state update, so only one delete is ever scheduled",
      ],
      answer: 0,
      explain:
        "`flushPending` exists so a swipe on a second row commits the first one instead of dropping it. That same rule makes a duplicate call for the same row harmful: it flushes the delete the user may still want to undo. Undo then only clears `pendingId`, but the row is already gone from SQLite, so it never comes back. The guard is reset in `onSwipeableClose`, and `commit()` calls `close()`, because FlashList recycles cells: without closing, a recycled cell (or the row an undo brings back) would show up already open with the guard still set.",
    },
  ],
});
