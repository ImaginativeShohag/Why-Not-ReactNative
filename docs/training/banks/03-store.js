QUIZ.register({
  slug: "store",
  number: "03",
  title: "Production commerce app",
  doc: "../03-commerce-platform.html",
  summary:
    "Trains the production patterns behind the store: Stack.Protected auth gating, secure token storage, single-flight token refresh with replay-once, collision-safe query keys, query persistence, optimistic updates, cart merge, a persisted checkout state machine with idempotency keys, server-owned payment status, push and deep-link routing, and how all of it is tested.",
  questions: [
    // ---------------------------------------------------------------- L1
    {
      id: "store-01",
      type: "text",
      level: 1,
      topics: ["Expo Router", "Deep Linking"],
      files: [
        "src/app/projects/store/(auth)/sign-in.tsx",
        "src/app/projects/store/(auth)/_layout.tsx",
        "src/projects/store/navigation/linkRoutes.ts",
      ],
      prompt:
        "Open `src/app/projects/store/(auth)/sign-in.tsx`. It sits inside the `(auth)` folder, and the whole store is nested under the launcher. Type the exact URL path, starting with `/`, that renders this screen.",
      accept: ["/projects/store/sign-in", "projects/store/sign-in", /^\/?projects\/store\/sign-in\/?$/i],
      explain:
        "Folders in parentheses are **route groups**. They organise files and layouts, but their names never appear in the URL, so `(auth)/sign-in.tsx` is just `sign-in`. The launcher owns the root, so every store route is prefixed with `/projects/store` (`STORE_PREFIX` in `linkRoutes.ts`). That's why `bag.tsx` pushes `/projects/store/sign-in`, and why the Home tab at `(app)/(tab)/index.tsx` is simply `/projects/store`.",
    },
    {
      id: "store-02",
      type: "mcq",
      level: 1,
      topics: ["Axios / API", "Architecture"],
      files: ["src/shared/api/axios.ts", "src/projects/store/api/client.ts"],
      prompt:
        "`src/shared/api/axios.ts` holds only a timeout and headers. `src/projects/store/api/client.ts` calls `sharedAxios.create({ baseURL })` four times. Why does the store derive its own instances instead of adding its interceptors to the shared one?",
      choices: [
        "A derived instance inherits the shared defaults (timeout, headers) but gets its own interceptor chain, so the store's 401/refresh logic never runs on the journal's or podcast's requests",
        "`create()` on an instance shares the parent's interceptors, so this is only a way to set a different `baseURL`",
        "The shared instance can't have interceptors because it is created at module scope",
        "TanStack Query needs one axios instance per project to deduplicate requests",
      ],
      answer: 0,
      explain:
        "Interceptors are **not** copied by `instance.create()`. Only the config defaults are merged. That is exactly the isolation the store wants: `installStoreInterceptors` is applied to `storeApi` and `backendApi` only (see `installInterceptorsOnce` in `SessionProvider.tsx`). The other projects have no session, so a store-shaped 401 handler on the shared instance would be a cross-project leak (audit item 11).",
    },
    {
      id: "store-03",
      type: "mcq",
      level: 1,
      topics: ["Auth & Security"],
      files: ["src/projects/store/auth/tokenStorage.ts", "docs/audit-03.md"],
      prompt:
        "In `auth/tokenStorage.ts`, both tokens are written with expo-secure-store using `keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY`. What does that option buy you?",
      choices: [
        "The item can only be read while the device is unlocked, and it never leaves the device: it isn't included in backups or restored onto a new phone",
        "The token is encrypted with the user's Face ID, so every read shows a biometric prompt",
        "The token is wiped automatically when the app goes to the background",
        "The token syncs through iCloud Keychain so the user stays signed in on their iPad",
      ],
      answer: 0,
      explain:
        "`WHEN_UNLOCKED_THIS_DEVICE_ONLY` is the strictest everyday Keychain class: the item is readable only while the device is unlocked, and the `THIS_DEVICE_ONLY` part keeps it out of backups and device migration. A refresh token is a long-lived credential, so it must not travel with a backup. Biometric prompts are a separate, opt-in feature (`auth/biometrics.ts`), and iCloud sync is the opposite of what this option does.",
    },
    {
      id: "store-04",
      type: "mcq",
      level: 1,
      topics: ["Auth & Security"],
      files: ["src/projects/store/auth/tokenStorage.ts", "src/projects/store/models/Auth.ts"],
      prompt: "In `tokenStorage.ts`, what goes into **AsyncStorage**?",
      choices: [
        "The non-sensitive `SessionUser` profile and boolean flags (onboarded, guest, biometric preference)",
        "The refresh token, because SecureStore values have a size limit",
        "The access token, so the request interceptor can read it synchronously",
        "Nothing: every store value goes through SecureStore",
      ],
      answer: 0,
      explain:
        "AsyncStorage is a plain file on disk, so the rule in the file header is that tokens never go there. Only the boot-UI profile (`store.session.user`) and the `\"1\"` flags live there. The interceptor's synchronous read comes from the in-memory `memoryAccessToken` variable (`getAccessToken`), not from storage, because SecureStore reads are async. The access token is *also* saved to SecureStore, so `loadTokens` can prime that variable on a cold start without a refresh round-trip.",
    },
    {
      id: "store-05",
      type: "text",
      level: 1,
      topics: ["TanStack Query", "Architecture"],
      files: ["src/projects/store/utils/queryKeys.ts"],
      prompt:
        "Every key built by the `queryKeys` factory in `src/projects/store/utils/queryKeys.ts` starts with the same first element. Type it.",
      accept: ["store", "\"store\"", "'store'"],
      explain:
        "`ROOT = \"store\"`. One `QueryClient` is shared by every project in the app (`src/shared/providers/QueryProvider.tsx`). A common prefix lets the store reach only its own cache: `invalidateQueries({ queryKey: queryKeys.all })`, the persister's `isStoreKey` filter, `setQueryDefaults(queryKeys.all, …)` and sign-out cleanup. Flat keys like `[\"products\"]` (audit item 6) could collide with another project.",
    },
    {
      id: "store-06",
      type: "mcq",
      level: 1,
      topics: ["Zustand"],
      files: ["src/projects/store/stores/cartStore.ts", "src/projects/store/checkout/checkoutStore.ts"],
      prompt:
        "`useCartStore` is wrapped in `persist(...)` with `partialize: (state) => ({ items: state.items })`. What does `partialize` do here?",
      choices: [
        "It picks the slice written to AsyncStorage: only `items`, not the action functions",
        "It splits the store into smaller stores so components re-render less",
        "It makes `items` read-only outside the store",
        "It sends `items` to SecureStore and the actions to AsyncStorage",
      ],
      answer: 0,
      explain:
        "`partialize` decides what `persist` serialises. Functions can't be JSON-encoded and don't need to be, because they're recreated when the store is created. `checkoutStore.ts` does the same thing by destructuring `send` away. `version: 1` reserves room for a future `migrate`, and `createJSONStorage(() => AsyncStorage)` is the storage adapter.",
    },
    {
      id: "store-07",
      type: "order",
      level: 1,
      topics: ["Architecture"],
      files: ["src/projects/store/checkout/checkoutMachine.ts"],
      prompt:
        "Put the checkout lifecycle from `checkout/checkoutMachine.ts` in order, from entering checkout to a finished purchase.",
      items: [
        "`address` step",
        "`shipping` step",
        "`payment` step",
        "`review` step",
        "`awaiting_payment` phase (after `ORDER_PLACED`)",
        "`completed` phase (after `COMPLETED`)",
      ],
      explain:
        "The machine has two axes. The **step** (`CHECKOUT_STEPS`) is where the user is in the form. The **phase** (`editing` → `awaiting_payment` → `completed`) is where the order is. `ORDER_PLACED` is ignored unless `step === \"review\"`, and after it `isLocked` freezes the earlier steps, because the server priced the order from them. `COMPLETED` is ignored without an `orderId`.",
    },
    {
      id: "store-08",
      type: "mcq",
      level: 1,
      topics: ["Payments", "Expo Config & EAS"],
      files: ["src/app/projects/store/_layout.tsx", "src/projects/store/api/payment.api.ts"],
      prompt:
        "In `src/app/projects/store/_layout.tsx`, `PaymentsProvider` returns `children` **without** `<StripeProvider>` when `env.stripePublishableKey` is empty. Why?",
      choices: [
        "So the native Stripe SDK is never initialised with an empty key; checkout then offers the simulated processor instead",
        "StripeProvider is only needed on Android",
        "To lazy-load Stripe once the user reaches the payment step",
        "Expo Go can't run Stripe, so it is turned off in development",
      ],
      answer: 0,
      explain:
        "Without a key there is nothing valid to initialise. Real card payments also need a backend: `isStripeConfigured()` in `payment.api.ts` requires the publishable key **and** `hasBackend()`, because a PaymentIntent has to be created server-side with the secret key. If either is missing, `payment.tsx` offers the clearly labelled simulated option.",
    },
    {
      id: "store-09",
      type: "text",
      level: 1,
      topics: ["Axios / API", "Payments"],
      files: ["src/projects/store/api/order.api.ts"],
      prompt:
        "When a real backend is configured, `placeOrder` in `api/order.api.ts` sends the checkout's idempotency key with the request. Type the name of the HTTP header that carries it.",
      accept: ["Idempotency-Key", /^idempotency[- ]?key$/i],
      explain:
        "`backendApi.post(\"/orders\", input, { headers: { \"Idempotency-Key\": idempotencyKey } })`. The server stores key → order id. A retry, a double tap or a relaunch that resends the same key gets the **same** order back instead of a second one. `mockServer.placeOrder` imitates this with its `idempotency` map.",
    },
    {
      id: "store-10",
      type: "mcq",
      level: 1,
      topics: ["Testing", "Axios / API"],
      files: ["src/projects/store/__tests__/refresh.test.ts"],
      prompt:
        "How does `__tests__/refresh.test.ts` exercise the **real** interceptors without a network or an HTTP mocking library?",
      choices: [
        "It creates an axios instance with a custom `adapter` function that acts as a fake server: only `Bearer fresh` gets a 200, everything else a 401",
        "It replaces `axios.get` with `jest.mock(\"axios\")`",
        "It starts a local Express server on localhost",
        "It calls the response interceptor function directly with fake errors",
      ],
      answer: 0,
      explain:
        "The adapter is the bottom layer of axios: the thing that actually performs a request. Swapping it keeps everything above it real: config merging, request and response interceptors, `instance.request` replays. So the test checks the production code path in `installStoreInterceptors`, and it can assert which `Authorization` headers the \"server\" received (`seen`).",
    },
    {
      id: "store-11",
      type: "text",
      level: 1,
      topics: ["Notifications"],
      files: [
        "src/projects/store/notifications/routeFromNotification.ts",
        "src/projects/store/__tests__/linking.test.ts",
      ],
      prompt:
        "Open `notifications/routeFromNotification.ts`. Which field of the notification's `data` must equal `\"store\"` before the store will route it? Type the field name.",
      accept: ["project", "data.project"],
      explain:
        "`parseNotificationData` returns `null` unless `d.project === \"store\"`. `expo-notifications` is process-global: the journal posts local notifications too (with a `url` under `/projects/offline-journal/`), and each project's router must ignore payloads that aren't its own. `linking.test.ts` checks this in \"ignores other projects' notifications\".",
    },
    {
      id: "store-12",
      type: "text",
      level: 1,
      topics: ["Deep Linking", "Expo Router"],
      files: [
        "src/projects/store/navigation/linkRoutes.ts",
        "src/app/+native-intent.tsx",
      ],
      prompt:
        "A user taps the universal link `https://<linkDomain>/p/42`. What store href does `rewriteStoreSystemPath` return?",
      accept: ["/projects/store/product/42", "projects/store/product/42"],
      explain:
        "`redirectSystemPath` in `src/app/+native-intent.tsx` runs each project's pure rewriter before expo-router resolves the URL, and the first match wins. `rewriteStoreSystemPath` checks that the host is our `linkDomain`, then `storeHrefFromWebPath` maps `/p/<digits>` to `/projects/store/product/<id>`. A non-numeric id or a foreign host returns `null`, and the router falls back to its own matching.",
    },

    // ---------------------------------------------------------------- L2
    {
      id: "store-13",
      type: "mcq",
      level: 2,
      topics: ["Expo Router", "Auth & Security"],
      files: ["src/app/projects/store/_layout.tsx"],
      prompt:
        "In the store layout, an onboarded **guest** passes the guards of both `(app)` (`onboarded && canBrowse`) and `(auth)` (`onboarded && !signedIn`). Opening `/projects/store` still lands them on the Home tab, not sign-in. Why?",
      choices: [
        "`(app)` is declared before `(auth)`, and the root URL lands on the first available screen in the Stack",
        "sign-in.tsx contains a `<Redirect>` that sends guests to the tabs",
        "`unstable_settings.initialRouteName` in the `(auth)` layout points at `(app)`",
        "Stack.Protected gives priority to whichever guard was evaluated last",
      ],
      answer: 0,
      explain:
        "`Stack.Protected` removes screens whose guard is false. Among the screens that remain, the navigator's initial route for `/projects/store` is the first one declared. The layout comments on this: \"Declared before (auth): a guest can reach both\". Because `(auth)` stays reachable, a guest can still push `/projects/store/sign-in` from the bag or Home. Once the status flips to `signedIn`, the `(auth)` guard becomes false and the router leaves that group on its own.",
    },
    {
      id: "store-14",
      type: "order",
      level: 2,
      topics: ["Axios / API", "Auth & Security"],
      files: [
        "src/projects/store/api/interceptors.ts",
        "src/projects/store/api/refreshCoordinator.ts",
        "src/projects/store/auth/SessionProvider.tsx",
      ],
      prompt:
        "Order what happens when a store request hits an expired access token. Start with the request leaving and end with the failure branch.",
      items: [
        "Request interceptor attaches `Authorization: Bearer <in-memory token>`",
        "The server answers 401 and `toApiError` maps it to kind `unauthorized`",
        "Response interceptor awaits `coordinator.refresh()`; concurrent 401s share the same promise",
        "The refresh function loads the refresh token, calls `refreshTokens`, and runs `saveTokens` before resolving",
        "The original config is cloned with `_isRetry: true` and replayed through `instance.request` with the new bearer",
        "If the replay is still 401, `onAuthFailure()` signs the user out instead of refreshing again",
      ],
      explain:
        "That is `installStoreInterceptors` plus the refresh function wired in `installInterceptorsOnce`. `saveTokens` updates `memoryAccessToken` and the rotated refresh token **before** the shared promise resolves, so any request started afterwards already carries the new token. The `_isRetry` flag caps it at one replay, so a broken session can't loop.",
    },
    {
      id: "store-15",
      type: "multi",
      level: 2,
      topics: ["Auth & Security", "TanStack Query", "Zustand"],
      files: [
        "src/projects/store/auth/SessionProvider.tsx",
        "src/projects/store/query/storeQuery.ts",
      ],
      prompt:
        "`signOut()` in `SessionProvider.tsx` is written against the **cached PII** failure mode: the next person on this device must not see the last user's data. Select all that apply: what does it clear?",
      choices: [
        "Both tokens from SecureStore (`clearTokens`)",
        "The cached orders, wishlist and user-profile queries (`clearUserScopedCache`)",
        "The persisted bag (`clearCart`) and the checkout machine (`RESET`)",
        "The cached product catalogue (`[\"store\", \"products\", …]`)",
        "The `store.onboarded` flag, so the next user sees onboarding again",
        "This device's push token registration on the backend (`unregisterForPushAsync`)",
      ],
      answer: [0, 1, 2, 5],
      explain:
        "`clearUserScopedCache` removes only `orders.all`, `wishlist.all` and `user.all`. The catalogue is the same for every user and is kept on purpose, so the next session starts instantly. Onboarding is a per-device flag and survives. Unregistering push matters too: otherwise the previous user's order updates would keep arriving on this phone (`push.api.ts`).",
    },
    {
      id: "store-16",
      type: "mcq",
      level: 2,
      topics: ["TanStack Query", "Offline & Sync"],
      files: ["src/projects/store/query/storeQuery.ts"],
      prompt:
        "`applyStoreDefaults()` sets `gcTime: DAY` for `[\"store\"]` keys, and the persister uses `maxAge: DAY`. What would go wrong if `gcTime` stayed at TanStack's 5-minute default?",
      choices: [
        "Inactive queries would be garbage-collected after 5 minutes and drop out of the next persisted snapshot, so a cold start hours later would have nothing to restore",
        "Every store query would refetch every 5 minutes",
        "`persistQueryClient` would throw, because `gcTime < maxAge` is a type error",
        "Restored data would count as fresh for 24 hours and never refetch",
      ],
      answer: 0,
      explain:
        "The persister writes whatever the cache holds. Once a query is GC'd it's gone from memory, and so from the next write. The comment states the rule: gcTime must be >= the persister's maxAge. `setQueryDefaults` matches by key prefix, so these defaults (and `staleTime: 60s` and the retry policy) affect only the store, never another project on the shared client.",
    },
    {
      id: "store-17",
      type: "multi",
      level: 2,
      topics: ["TanStack Query", "Offline & Sync", "Auth & Security"],
      files: ["src/projects/store/query/storeQuery.ts", "src/projects/store/utils/queryKeys.ts"],
      prompt:
        "Look at `shouldDehydrateQuery` in `startStorePersistence()`. Select all queries it writes to AsyncStorage.",
      choices: [
        "`[\"store\", \"products\", \"list\", {}]` with status `success`",
        "`[\"store\", \"user\", \"profile\", 1]` with status `success`",
        "`[\"podcast\", \"feed\", \"abc\"]` with status `success`",
        "`[\"store\", \"orders\", \"list\", 1]` with status `error`",
        "`[\"store\", \"wishlist\", \"ids\", \"guest\"]` with status `success`",
        "`[\"store\", \"orders\", \"detail\", \"10482\"]` with status `success`",
      ],
      answer: [0, 4, 5],
      explain:
        "Three conditions must all hold: `isStoreKey` (first element `\"store\"`), `!isSensitiveKey` (second element isn't `\"user\"`: profile PII never touches disk), and `status === \"success\"`. Orders and wishlist **are** persisted, which is how the orders screen works offline (audit item 9). They're removed from memory at sign-out by `clearUserScopedCache`, so the next write drops them. Mutations are never persisted (`shouldDehydrateMutation: () => false`).",
    },
    {
      id: "store-18",
      type: "mcq",
      level: 2,
      topics: ["TanStack Query", "Axios / API"],
      files: ["src/projects/store/query/storeQuery.ts", "src/projects/store/api/errors.ts"],
      prompt:
        "With the store's `retry` default, `(failureCount, error) => failureCount < 2 && (!(error instanceof ApiError) || error.isTransient)`, a product detail request fails with **404**. How many times does `queryFn` run before the query shows an error? And for a **503**?",
      choices: [
        "404: once. 503: three times (the first attempt plus 2 retries)",
        "404: four times. 503: four times (TanStack's default `retry: 3`)",
        "404: three times. 503: three times",
        "404: once. 503: twice",
      ],
      answer: 0,
      explain:
        "The interceptor rethrows every non-401 failure as an `ApiError`. A 404 becomes kind `notFound`, and `isTransient` is false for it, so there's no retry: retrying a missing resource just wastes time. A 503 becomes `server`, which is transient. TanStack passes `failureCount` = 0 on the first failure and 1 on the second (both `< 2`, so both retry), then 2 (stop). That's 3 attempts in total.",
    },
    {
      id: "store-19",
      type: "mcq",
      level: 2,
      topics: ["TanStack Query"],
      files: ["src/projects/store/hooks/useWishlist.ts", "src/projects/store/utils/devFlags.ts"],
      prompt:
        "In `useToggleWishlist`, why does `onMutate` run `await queryClient.cancelQueries({ queryKey: key })` before it writes the optimistic list?",
      choices: [
        "A wishlist fetch already in flight could resolve after the optimistic write and overwrite it with stale server data, so the heart would flip back",
        "To stop the mutation from running twice",
        "`setQueryData` throws if the query is fetching",
        "To empty the cache, so that `onError` has nothing to roll back",
      ],
      answer: 0,
      explain:
        "Optimistic updates follow a recipe: cancel in-flight reads, snapshot (`previous`), write the expected state, return the snapshot as context. Then `onError` restores it (\"the UI must not keep lying\") and `onSettled` invalidates, so the cache converges on the server's truth. Turn on the dev flag `failWishlistWrites` to watch the rollback happen.",
    },
    {
      id: "store-20",
      type: "mcq",
      level: 2,
      topics: ["Zustand", "Offline & Sync"],
      files: ["src/projects/store/stores/cartMath.ts", "src/projects/store/__tests__/cartMath.test.ts"],
      prompt:
        "Apply `mergeCarts` from `stores/cartMath.ts`. Local cart = [#1 ×2, #2 ×1]. Server cart = [#1 ×3, #3 ×1, #99 ×2]. Product #99 is no longer in the catalogue. What is the merged cart?",
      choices: [
        "[#1 ×3, #2 ×1, #3 ×1]",
        "[#1 ×5, #2 ×1, #3 ×1]",
        "[#1 ×3, #2 ×1, #3 ×1, #99 ×2]",
        "[#1 ×3, #3 ×1] (the server cart wins)",
      ],
      answer: 0,
      explain:
        "The rule: union by product id; on overlap take the **max** quantity, not the sum; server lines whose product can't be resolved are dropped; quantities are clamped to `MAX_QUANTITY_PER_ITEM`. Local order is kept and server-only lines are appended. Max instead of sum makes the merge idempotent: the usual case is the same cart synced earlier from this device, and summing would double it on every sign-in (see the \"is idempotent\" test).",
    },
    {
      id: "store-21",
      type: "multi",
      level: 2,
      topics: ["Notifications", "Platform Differences"],
      files: [
        "src/projects/store/notifications/registerForPush.ts",
        "src/projects/store/notifications/handlers.ts",
        "src/app/projects/store/(app)/checkout/review.tsx",
        "src/app/projects/store/(app)/(tab)/account.tsx",
      ],
      prompt:
        "Select all that apply: which statements about push permission and token registration in the store are true?",
      choices: [
        "The OS prompt is only shown after a purchase (`offerPushAfterPurchase` in review.tsx) or from the Account tab, each time behind an in-app rationale `Alert` first",
        "`registerForPushAsync` never prompts: it returns `null` unless permission is already granted",
        "On Android the notification channels are created before the permission prompt, because Android 13+ only shows the prompt once a channel exists",
        "`usePushLifecycle` runs in the root layout, so the token is registered even when the user never opens the store",
        "On a simulator, `registerForPushAsync` still fetches an Expo push token for testing",
      ],
      answer: [0, 1, 2],
      explain:
        "iOS shows the system prompt only once, so `askForOrderUpdates` explains the value first and asks at the moment the user wants updates most (right after buying). `usePushLifecycle(signedIn)` lives in the **store** layout and registers only for a signed-in session. It re-registers on token rotation and clears the badge on foreground. `registerForPushAsync` returns early when `!Device.isDevice`, because simulators can't receive remote push.",
    },
    {
      id: "store-22",
      type: "multi",
      level: 2,
      topics: ["Deep Linking", "Notifications", "Auth & Security"],
      files: [
        "src/projects/store/navigation/linkRoutes.ts",
        "src/projects/store/notifications/routeFromNotification.ts",
        "src/projects/store/__tests__/linking.test.ts",
      ],
      prompt:
        "External input (URLs, push payloads) is untrusted. Select all statements that match what `linkRoutes.ts` and `routeFromNotification.ts` do, as pinned by `linking.test.ts`.",
      choices: [
        "`rewriteStoreSystemPath(\"https://evil.example/p/42\", DOMAIN)` returns `null`: only our own link domain is rewritten",
        "`https://<DOMAIN>/p/abc` returns `null`, because product ids must match `^\\d+$`",
        "A push with `orderId: \"../../x\"` produces no href, because order ids must match `^[A-Za-z0-9-]+$`",
        "`whynotreactnative://projects/store/bag` is rewritten by `rewriteStoreSystemPath` into `/projects/store/bag`",
        "When a push payload contains a `url` field, the store navigates to it directly",
      ],
      answer: [0, 1, 2],
      explain:
        "Routes are **built** from validated ids, never copied from the input. So a crafted push or link can't navigate somewhere arbitrary. Custom-scheme URLs aren't touched by the rewriter (it returns `null` for non-web URLs): they're already namespaced (`/projects/store/...`), and expo-router matches them itself. The store never reads a `url` from its payloads. That field is the journal's contract.",
    },
    {
      id: "store-23",
      type: "text",
      level: 2,
      topics: ["Deep Linking", "Expo Router", "Auth & Security"],
      files: [
        "src/projects/store/navigation/useIntentReplay.ts",
        "src/projects/store/navigation/linkRoutes.ts",
      ],
      prompt:
        "Guests may browse, but some destinations need an account. Which pure function in `navigation/linkRoutes.ts` does `useIntentReplay` call to decide that a guest must sign in first (for example for `/checkout/...` or `/order/...`)? Type the function name.",
      accept: ["requiresAccount", "requiresAccount()"],
      explain:
        "`requiresAccount` checks the href against `ACCOUNT_PATHS = [\"/checkout\", \"/orders\", \"/order\"]`. When it's true and the status isn't `signedIn`, `useIntentReplay` re-parks the intent with `setPending(href)` and pushes `/projects/store/sign-in`. The effect runs again when the status flips, so the user lands where they meant to go. `isProtectedStoreHref` is the other predicate: it decides which deep links get captured at all while signed out.",
    },
    {
      id: "store-24",
      type: "mcq",
      level: 2,
      topics: ["React Hooks", "React Compiler", "TanStack Query"],
      files: ["src/projects/store/query/storeQuery.ts", "src/shared/providers/QueryProvider.tsx"],
      prompt:
        "`useIsOnline` in `storeQuery.ts` is written as `useSyncExternalStore(onChange => onlineManager.subscribe(onChange), () => onlineManager.isOnline(), () => true)` rather than `useState` plus a subscribing `useEffect`. Why?",
      choices: [
        "`onlineManager` is an external store. `useSyncExternalStore` reads it during render without tearing, and avoids calling setState inside an effect, which the React Compiler rules flag",
        "`useState` can't hold a boolean that changes outside React in React 19",
        "`onlineManager` only works inside a component rendered by `QueryClientProvider`",
        "`useSyncExternalStore` runs the hook on the UI thread for lower latency",
      ],
      answer: 0,
      explain:
        "`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` is React's primitive for subscribing to non-React state. Every render reads a consistent snapshot, and there's no extra commit cycle. The third argument is the server/hydration snapshot. `onlineManager` itself is wired once, app-wide, to expo-network in `QueryProvider.tsx`, because React Native has no `navigator.onLine`.",
    },
    {
      id: "store-25",
      type: "text",
      level: 2,
      topics: ["Payments", "Architecture"],
      files: ["src/projects/store/checkout/pricing.ts", "src/projects/store/__tests__/checkout.test.ts"],
      prompt:
        "Work it out with `computeTotals` in `checkout/pricing.ts`: subtotal `12000` cents, promo `\"save10\"`, shipping `\"standard\"`, country `\"US\"`. What is `totalCents`? Type the integer number of cents.",
      accept: ["11691", "11,691", "$116.91", "116.91"],
      explain:
        "Discount = round(12000 × 10%) = 1200, which leaves 10800. Standard shipping costs 500, but `freeOverCents: 10000` is compared with the **post-discount** subtotal (10800 ≥ 10000), so shipping is 0. Tax = round((10800 + 0) × 0.0825) = 891. Total = 10800 + 0 + 891 = 11691. Everything is integer cents, so there's no float drift (`utils/money.ts`). The client only previews prices; the comment says production validates promos on the server.",
    },
    {
      id: "store-26",
      type: "multi",
      level: 2,
      topics: ["FlashList", "TanStack Query", "Performance"],
      files: [
        "src/projects/store/components/ui/ProductGrid.tsx",
        "src/app/projects/store/(app)/(tab)/index.tsx",
        "src/projects/store/hooks/useProduct.ts",
      ],
      prompt:
        "Select all that apply about the catalogue grid (`ProductGrid.tsx`, FlashList v2) and how Home feeds it.",
      choices: [
        "`masonry` together with `numColumns={2}` gives the two-column grid with items of varying height",
        "Home only calls `fetchNextPage()` from `onEndReached` when `hasNextPage && !isFetchingNextPage`",
        "`estimatedItemSize` is a required prop, without which FlashList v2 refuses to render",
        "`useInfiniteProducts` flattens the pages with `select: data => data.pages.flatMap(p => p.items)`, so the grid gets a plain `Product[]`",
        "Every list in the store (orders, wishlist, search results) uses FlashList",
      ],
      answer: [0, 1, 3],
      explain:
        "FlashList v2 measures items itself and dropped `estimatedItemSize`. `masonry` is a prop on FlashList, not a separate component. The guard on `onEndReached` stops a fast scroll from firing duplicate page requests. `getNextPageParam` reads `nextPage`, which `fetchProductPage` emulates with `?limit=` because FakeStoreAPI has no offset. The orders, wishlist and search screens use plain `FlatList`.",
    },
    {
      id: "store-27",
      type: "explain",
      level: 2,
      topics: ["Architecture", "Payments", "Zustand"],
      files: [
        "src/projects/store/checkout/checkoutMachine.ts",
        "src/projects/store/checkout/checkoutStore.ts",
        "src/projects/store/hooks/useCheckout.ts",
        "src/projects/store/api/mockServer.ts",
      ],
      prompt:
        "Trace the idempotency key's life: where it's created, where it's stored, how it's reused, and when a new one is minted. Then explain what would break if `usePlaceOrder` generated a fresh `Crypto.randomUUID()` on every tap instead.",
      model:
        "The key is created once per checkout attempt, when `useStartCheckout` sends `START` with a UUID. `transition` keeps the existing key if an unfinished attempt exists, so a resume never swaps it. It lives in the checkout machine, which `checkoutStore` persists to AsyncStorage, so it survives a force-quit. `usePlaceOrder` sends `checkout.idempotencyKey` with every attempt, and once `orderId` is known it just calls `fetchOrder`. The server, or `mockServer.placeOrder`, maps key → order, so a double tap, a retry after a timeout or a relaunch all return the same order. A new key is only minted after `COMPLETED`, or after `RESET` (\"Start over\") followed by `START`. If each tap made its own key, a lost response followed by a retry would create a second order, and the user could be charged twice.",
      rubric: [
        "Key created by `START` (useStartCheckout) and kept on resume",
        "Persisted with the machine in AsyncStorage (checkoutStore), so it survives relaunch",
        "The same key is reused by every placeOrder retry; the server maps key → existing order",
        "New key only after COMPLETED or RESET + START",
        "A per-tap key turns a retry or lost response into duplicate orders or charges",
      ],
      explain:
        "Idempotency only works if the key identifies the *attempt*, not the *request*. That's why it lives in persisted state and not in a local variable. `checkout.test.ts` pins the resume behaviour: \"resumes an interrupted checkout with the same idempotency key\".",
    },
    {
      id: "store-28",
      type: "explain",
      level: 2,
      topics: ["Deep Linking", "Expo Router", "Auth & Security"],
      files: [
        "src/app/projects/store/_layout.tsx",
        "src/projects/store/navigation/pendingIntent.ts",
        "src/projects/store/navigation/useIntentReplay.ts",
      ],
      prompt:
        "`useCaptureDeepLinkIntent` in the store layout reads `Linking.useLinkingURL()` and parks protected hrefs with `setPendingIntent`. Why is this needed when `Stack.Protected` already guards the routes? What role do the `handledUrls` set and `isProtectedStoreHref` play?",
      model:
        "`Stack.Protected` only blocks: a signed-out user who opens `whynotreactnative://projects/store/order/7` is bounced to the first available group, sign-in, and the router forgets where they were going. The hook captures that URL, converts it with `storeHrefFromUrl`, and, if `isProtectedStoreHref` says it sits behind the guard, stores it in the `usePendingIntent` buffer. After sign-in, `(app)` mounts and `useIntentReplay` pushes the saved href, so the user lands on the order instead of Home (audit item 3). `handledUrls` stops the same linking URL from being re-captured on every re-render or status change, because `useLinkingURL` keeps returning the last URL. Public paths such as sign-in or onboarding are skipped because they don't need replaying.",
      rubric: [
        "Stack.Protected redirects but loses the original destination",
        "The URL is mapped to a store href and parked in the pending-intent buffer",
        "useIntentReplay in the (app) layout replays it once signed in and mounted",
        "handledUrls makes capture happen once per URL",
        "isProtectedStoreHref filters out public paths",
      ],
      explain:
        "This is the \"intent buffer\" pattern. Guards decide *whether* you may see a screen; something else has to remember *what* you were trying to open. The same buffer is used by push taps (`handlers.ts`) and by the bag's \"Sign in to check out\".",
    },
    {
      id: "store-29",
      type: "explain",
      level: 2,
      topics: ["Notifications", "Architecture"],
      files: ["src/projects/store/notifications/handlers.ts", "src/app/_layout.tsx"],
      prompt:
        "`Notifications.setNotificationHandler` is process-global. Explain why the store's `installNotificationHandler` returns `shouldShowBanner: true` and `shouldShowList: true` for **every** notification, but turns on sound and badge only for store payloads. What would break if it returned `shouldShowBanner: false` for non-store notifications?",
      model:
        "There is only one foreground handler per process, and the last call wins. The app holds six projects, so whatever the store installs also decides how the journal's reminders look in the foreground. The handler is therefore deliberately neutral: everything is shown as a banner and a list entry. Store-specific behaviour (sound, and the badge the server sets in the payload) is turned on only when `parseNotificationData` recognises `project: \"store\"`. If it hid non-store notifications, the journal's reminders would be silently swallowed while the app is open, even though the journal never asked for that. The module-level `handlerInstalled` and `listenerStarted` flags keep installation idempotent.",
      rubric: [
        "setNotificationHandler is a single, global, last-writer-wins handler",
        "The handler affects other projects' notifications (the journal's reminders)",
        "Neutral default for all; store extras gated on the `project` discriminator",
        "Hiding non-store notifications would break the journal in the foreground",
      ],
      explain:
        "Process-global APIs (notification handler, `focusManager`, `onlineManager`) need a single owner and neutral defaults in a multi-project app. Here the root layout decides the owner: importing the journal's reminders module sets the journal's handler at module scope, then `startNotificationResponseListener()` calls `installNotificationHandler()`, so the store's handler is the last writer for the whole app. That is why its non-store branch matches what the journal asks for itself: banner and list, no sound, no badge.",
    },
    // ---------------------------------------------------------------- L3
    {
      id: "store-30",
      type: "mcq",
      level: 3,
      topics: ["Axios / API", "Auth & Security"],
      files: [
        "src/projects/store/api/client.ts",
        "src/projects/store/api/auth.api.ts",
        "src/projects/store/api/refreshCoordinator.ts",
      ],
      prompt:
        "`refreshTokens` posts to `/auth/refresh` through `authBackendApi`, which has **no** interceptors installed, and it also passes `{ skipAuthRefresh: true }`. Suppose instead the refresh went through `backendApi` (interceptors installed) and the server rejected it with a 401. What would happen?",
      choices: [
        "The 401 would call `coordinator.refresh()`, which returns the in-flight promise: the refresh would be waiting on itself, and every queued request would hang",
        "axios would detect the recursion and throw a `RangeError`",
        "The coordinator would start a second, independent refresh, so the user would see two prompts",
        "Nothing different: the interceptor ignores requests whose URL contains `/auth/`",
      ],
      answer: 0,
      explain:
        "While a refresh is in flight, `refresh()` returns `inFlight`. If the refresh request's own 401 went back into the interceptor, it would await `inFlight`, which can't settle until that very handler returns: a deadlock. That's why there are two separate guards: auth calls use instances without interceptors (`client.ts`: \"a failing refresh can never recurse into another refresh\"), and `skipAuthRefresh` is an explicit opt-out, tested in \"never refreshes for requests that opt out\". The interceptor does not look at URLs.",
    },
    {
      id: "store-31",
      type: "mcq",
      level: 3,
      topics: ["Axios / API", "Auth & Security"],
      files: ["src/projects/store/api/refreshCoordinator.ts", "src/projects/store/__tests__/refresh.test.ts"],
      prompt:
        "`createRefreshCoordinator` clears its cached promise in `.finally(() => { inFlight = null })`. If it were cleared only in `.then(...)`, what would break?",
      choices: [
        "After one failed refresh, `inFlight` would keep pointing at the rejected promise, so every later 401 would reuse that rejection instantly: no refresh could happen again until the app restarts",
        "Concurrent callers would each start their own refresh",
        "Successful refreshes would never resolve",
        "Nothing, because a rejected promise is falsy, so `if (inFlight)` would skip it",
      ],
      answer: 0,
      explain:
        "A promise object is truthy whatever its state. `finally` runs on success **and** failure, so the slot is always released. The test \"a later 401 after the first refresh settles starts a new refresh\" (expecting `refreshCount` of 2) only passes because the slot is cleared. Single-flight means one refresh **at a time**, not one refresh ever.",
    },
    {
      id: "store-32",
      type: "explain",
      level: 3,
      topics: ["Axios / API", "Auth & Security", "Testing"],
      files: [
        "src/projects/store/api/refreshCoordinator.ts",
        "src/projects/store/__tests__/refresh.test.ts",
        "src/app/projects/store/(app)/(tab)/account.tsx",
      ],
      prompt:
        "Five or six requests fire in parallel and all get a 401. Explain what goes wrong with a naive interceptor that refreshes once **per request** when the server rotates refresh tokens, and how `refreshCoordinator` prevents it. Then say what the test \"six concurrent 401s trigger exactly one refresh and zero sign-outs\" asserts, and how you can reproduce it by hand in the app.",
      model:
        "With rotation, every successful refresh invalidates the refresh token it consumed and issues a new one. Six parallel refreshes all send the same refresh token: the first succeeds, the rest present a token that's already been rotated away (or rotate it again, invalidating the pair the others just stored). The server treats that as reuse and rejects it, `onAuthFailure` fires, and the user is logged out for no reason. The coordinator keeps one `inFlight` promise: the first caller starts `refreshFn()`, every concurrent caller gets the same promise, and the slot is cleared in `finally`. The test drives six `instance.get` calls through a fake adapter. It asserts that all six succeed with their own URLs, that the refresh mock ran exactly once (`refreshCount === 1`), and that `onAuthFailure` was never called. In the app, the Account tab's dev menu does the same: turn on \"Force 401 on first attempt\" and tap \"Fire 6 requests at once\", which reports the refresh call count.",
      rubric: [
        "Rotation: each refresh invalidates the previous refresh token",
        "Parallel refreshes cause reuse or rejection, which means a spurious logout",
        "Coordinator shares one in-flight promise among concurrent callers and clears it in finally",
        "Test asserts 6 successes, 1 refresh, 0 onAuthFailure",
        "Dev menu: Force 401 + Fire 6 requests reproduces it on device",
      ],
      explain:
        "The header comment of `refreshCoordinator.ts` calls this \"the part everyone gets wrong\". The fix is tiny (cache the promise, not the result) but it only holds up because the test proves it under real concurrency.",
    },
    {
      id: "store-33",
      type: "mcq",
      level: 3,
      topics: ["Axios / API", "Testing"],
      files: ["src/projects/store/api/interceptors.ts", "src/projects/store/utils/devFlags.ts"],
      prompt:
        "With the dev flag `forceUnauthorized` on, the request interceptor sets `config.adapter = forcedUnauthorizedAdapter` on a request's first attempt. Before replaying, the response interceptor builds `retryConfig = { ...config, _isRetry: true }` and then runs `delete retryConfig.adapter`. Without that `delete`, what would happen?",
      choices: [
        "The replay would carry the forced adapter, 401 again, and, because `_isRetry` is set, call `onAuthFailure()`, signing the user out even though the refresh worked",
        "axios rejects any custom adapter on a replayed request",
        "The replay would skip the request interceptor and be sent without an `Authorization` header",
        "Nothing: the request interceptor resets the adapter on every attempt",
      ],
      answer: 0,
      explain:
        "The spread copies every field, including the adapter. The request interceptor only installs the forced adapter when `!_isRetry`, but it never *removes* one, so the copied adapter would stay. The replay would then fail with a synthetic 401, and the `_isRetry` branch would treat it as a genuinely dead session. The comment says it plainly: \"A forced adapter must not leak into the replay\". Deleting it falls back to the instance's default adapter.",
    },
    {
      id: "store-34",
      type: "text",
      level: 3,
      topics: ["Testing", "Axios / API"],
      files: ["src/projects/store/__tests__/refresh.test.ts", "src/projects/store/api/interceptors.ts"],
      prompt:
        "In `refresh.test.ts`, the test \"gives up instead of looping when the replay is still unauthorized\" makes the refresh return `\"still-bad\"`. Type the `Authorization` headers the fake server sees (`seen`), in order, separated by commas.",
      accept: [
        "Bearer expired, Bearer still-bad",
        "Bearer expired,Bearer still-bad",
        /^\s*["']?bearer\s+expired["']?\s*,\s*["']?bearer\s+still-bad["']?\s*$/i,
      ],
      explain:
        "The first request uses the in-memory token `\"expired\"` → 401 → one refresh → one replay with `Bearer still-bad` → 401 again. The replay has `_isRetry: true`, so the interceptor calls `onAuthFailure()` (once) and rethrows, without refreshing again. There are exactly two requests and no loop. The test also pins `refresh` called once and `onAuthFailure` called once.",
    },
    {
      id: "store-35",
      type: "mcq",
      level: 3,
      topics: ["TanStack Query", "Performance"],
      files: [
        "src/projects/store/hooks/useProduct.ts",
        "src/projects/store/query/storeQuery.ts",
        "src/projects/store/__tests__/prefetch.test.ts",
      ],
      prompt:
        "On press-in, `usePrefetchProduct` seeds an empty detail entry with `setQueryData(detailKey, product, { updatedAt: 0 })`, then calls `prefetchQuery({ queryKey: detailKey, queryFn, staleTime: 60_000 })`. The store's default `staleTime` is also 60 s. Why the `updatedAt: 0`, and what would happen without it?",
      choices: [
        "Without it, `setQueryData` stamps `dataUpdatedAt = now`, so `prefetchQuery` and the detail screen's `useQuery` would both see fresh data and never send `GET /products/:id`. With `0` the seed still paints instantly, but it is already stale, so the prefetch fetches and replaces it",
        "It keeps the seeded entry out of the persisted AsyncStorage snapshot",
        "It gives the seed a `gcTime` of 0, so it is dropped from the cache and the detail screen shows a spinner until the request resolves",
        "`setQueryData` throws for a query that has never been fetched unless `updatedAt` is passed",
      ],
      answer: 0,
      explain:
        "Freshness is plain arithmetic: a query is stale once `dataUpdatedAt + staleTime <= now` (`isStaleByTime` in query-core). Data written by `setQueryData` counts as fetched *now* unless you pass `updatedAt`, so a plain seed would turn the prefetch into a no-op, and the detail screen would show list data as if it were the detail response. `updatedAt: 0` keeps the data for painting but dates it to 1970, so exactly one request runs on press-in. A detail screen opened within the next minute finds fresh, real detail data and sends nothing. `__tests__/prefetch.test.ts` pins both halves against a real `QueryClient`. The deep-link path (no seed) uses `placeholderData` in `useProductDetails` instead. Placeholder data never enters the cache, so that request runs too.",
    },
    {
      id: "store-36",
      type: "explain",
      level: 3,
      topics: ["Zustand", "Offline & Sync"],
      files: [
        "src/projects/store/stores/cartSync.ts",
        "src/projects/store/stores/hydration.ts",
        "src/app/projects/store/_layout.tsx",
      ],
      prompt:
        "`reconcileCartOnSignIn` starts with `await useCartStore.persist.rehydrate()`. The store layout already waits for `hydrateStoreState()`, but it gives up after `RESTORE_TIMEOUT_MS` (1500 ms). Explain the race this guards against and what the user would lose without it. Also explain why `establish()` doesn't `await` the reconcile.",
      model:
        "Zustand's `persist` hydrates from AsyncStorage asynchronously. If disk I/O is slow, the layout's 1.5 s timeout lets the UI render before the cart has hydrated, and the in-memory `items` is still `[]`. If the user signs in right then, `mergeWithServer` would merge an empty local cart with the server cart and push the result back with `updateServerCart`, so the guest's items never reach the server. When hydration finished a moment later, it would overwrite `items` with the old persisted cart, throwing away the merged result. Awaiting `rehydrate()` first guarantees the merge runs on the real local cart. `establish()` doesn't await it, so navigation isn't blocked on a network merge: the bag updates when it's done. It's best effort, so a failure is reported to monitoring and leaves the local cart untouched.",
      rubric: [
        "persist hydration is async; the boot timeout can let UI and sign-in run before it",
        "Merging an un-hydrated (empty) cart pushes incomplete data to the server",
        "Late hydration would overwrite the merged items",
        "rehydrate() forces the real local cart in first",
        "Reconcile is fire-and-forget so it doesn't block navigation; failures leave the cart intact",
      ],
      explain:
        "Async-hydrated stores have a window where they hold their initial state. Any code that reads and then writes them (merge, sync, migration) must wait for hydration, not just the UI. `hydration.ts` covers rendering; `cartSync.ts` covers the write path.",
    },
    {
      id: "store-37",
      type: "mcq",
      level: 3,
      topics: ["Zustand", "Architecture"],
      files: [
        "src/app/projects/store/(app)/(tab)/bag.tsx",
        "src/projects/store/checkout/checkoutMachine.ts",
        "src/projects/store/__tests__/checkout.test.ts",
      ],
      prompt:
        "A checkout reaches `completed` (`orderId` is still set). The user adds new items, opens the bag, types `SAVE10`, presses the keyboard's Done key, then taps Check out. `bag.tsx` reads `promoLocked = useCheckoutStore(isLocked)`, where `isLocked(state) = orderId !== null && phase !== \"completed\"`. Which statement is accurate?",
      choices: [
        "The code is applied, and `START` carries it into the new attempt. `isLocked` is false once the phase is `completed`, and `COMPLETED` already cleared the last order's code, so any code present now belongs to the next checkout",
        "Apply is disabled until the next `START`, because `orderId` stays set after `COMPLETED`",
        "The code is applied, but `START` drops it, because a completed checkout always restarts with `promoCode: null`",
        "The bag shows the previous order's code as applied, because `COMPLETED` keeps `promoCode`",
      ],
      answer: 0,
      explain:
        "The bag uses the machine's own predicate instead of re-implementing it in a selector. An earlier version used `orderId !== null`, which stays true after `COMPLETED`. Apply was disabled while the machine would still accept `APPLY_PROMO`, the keyboard submit applied the code anyway, and `START` then dropped it. Two details now keep everything consistent. `promoLocked` drives both the disabled button and an early return inside `applyPromo`, because `onSubmitEditing` doesn't care that a button is disabled. And `START` keeps `state.promoCode` unconditionally, which is safe because `COMPLETED` nulls it. The test \"unlocks promos after completion and carries a new code into the next START\" pins this.",
    },
    {
      id: "store-38",
      type: "multi",
      level: 3,
      topics: ["Testing", "Expo Config & EAS", "Release & CI"],
      files: [
        ".maestro/store-checkout.yaml",
        "src/app/projects/store/(auth)/sign-in.tsx",
        "src/app/projects/store/(app)/checkout/payment.tsx",
      ],
      prompt:
        "Select all reasons why `.maestro/store-checkout.yaml` would fail against a **production** build that has Stripe configured.",
      choices: [
        "`appId` is `org.imaginativeworld.whynotreactnative.dev`, the development variant's bundle id",
        "The `sign-in-fill-demo` button only renders when `env.variant !== \"production\"`",
        "`payment-simulated` is hidden when Stripe is configured in production (`simulatedAllowed`)",
        "Maestro can't match the header title against the regex `Order #.*`",
        "`tapOn: \"Store\"` fails because the launcher hides projects in production builds",
      ],
      answer: [0, 1, 2],
      explain:
        "`APP_VARIANT` changes the bundle id (`.dev` / `.preview` / base), so the flow targets the dev build. It relies on two non-production affordances: the dev-only demo-user fill (which replaced the hardcoded credentials, audit item 4) and the simulated processor. Its own header says to run it against a dev or preview build. The launcher renders every `PROJECTS` entry in every variant, and `extendedWaitUntil` with `visible: \"Order #.*\"` matches the title that `order/[id].tsx` sets through `<Stack.Screen options>`.",
    },
    {
      id: "store-39",
      type: "order",
      level: 3,
      topics: ["Auth & Security", "Expo Router", "TanStack Query"],
      files: ["src/projects/store/auth/SessionProvider.tsx"],
      prompt: "Order the steps of `signOut()` in `SessionProvider.tsx`.",
      items: [
        "Return early if `signingOut.current` is set, so concurrent auth failures run it once",
        "Revoke the session and unregister the push token with `Promise.allSettled` (best effort, works offline)",
        "`clearTokens()` then `clearUser()`",
        "`clearUserScopedCache()`, `clearCart()` and checkout `RESET`",
        "`setState({ status: \"signedOut\" })`, after which Stack.Protected swaps `(app)` for `(auth)`",
      ],
      explain:
        "The ref guard matters because the refresh test shows `onAuthFailure` can fire once per failed request. Network cleanup is `allSettled`, so a dead connection can't block local sign-out. Local secrets and PII are wiped **before** the state flip, so by the time the UI re-renders there's nothing left to leak. Navigation isn't imperative: changing the status is enough for the guards.",
    },
    {
      id: "store-40",
      type: "order",
      level: 3,
      topics: ["Notifications", "Expo Router", "Deep Linking"],
      files: [
        "src/app/_layout.tsx",
        "src/projects/store/notifications/handlers.ts",
        "src/app/projects/store/_layout.tsx",
        "src/projects/store/navigation/useIntentReplay.ts",
      ],
      prompt:
        "The app is killed. The user taps a push with `{ project: \"store\", type: \"order\", orderId: \"10482\" }`. Order the steps that bring them to the order screen.",
      items: [
        "The root layout module is evaluated and calls `startNotificationResponseListener()`",
        "`getLastNotificationResponse()` returns the tap, and `hrefFromNotification` builds `/projects/store/order/10482`",
        "`setPendingIntent(href)`; because the (app) navigator isn't mounted, `router.navigate(\"/projects/store\")`",
        "The store layout keeps the splash up until the session and the cache restore resolve, then Stack.Protected mounts `(app)`",
        "`useIntentReplay` sees a pending href, a navigation key and a non-loading status, and pushes it on the next animation frame",
      ],
      explain:
        "A project layout only loads when the store is opened, so the listener must start at the root, or a cold-start tap would be lost. `handleResponse` **buffers** instead of navigating: the session may still be loading and the target navigator may not exist yet. The replay waits for `useRootNavigationState()?.key` and `status !== \"loading\"`, and defers with `requestAnimationFrame` so guard-driven navigation settles first. Responses are de-duplicated by `identifier:actionIdentifier`, because a cold start can deliver the same tap twice.",
    },
    {
      id: "store-41",
      type: "explain",
      level: 3,
      topics: ["Payments", "Offline & Sync", "Architecture"],
      files: [
        "src/app/projects/store/(app)/checkout/review.tsx",
        "src/projects/store/api/mockServer.ts",
        "src/projects/store/hooks/useCheckout.ts",
        "src/projects/store/models/Order.ts",
      ],
      prompt:
        "Set the dev flag \"Simulated payment outcome\" to `network_drop` and place an order. Explain what `mockServer.confirmSimulatedPayment` does in that case, what `pay()` reports, and why the user still ends up on a paid order. Then explain how `useReconcilePendingCheckout` covers the case where the app is killed right after the charge.",
      model:
        "`network_drop` simulates a charge that succeeded but whose response was lost: the mock server marks the order `paid` (and records `paidAt`), then throws a `network` `ApiError`. `usePayment.pay()` catches that and returns `{ status: \"failed\" }`, because that's all the client saw. `handlePlaceOrder` in review.tsx never trusts that result: it always calls `fetchOrder(order.id)`, and since the server says `paid` (`isPaid`), it calls `finish()`, which runs `complete()` (cache update, clear the bag, `COMPLETED`) and navigates to the order. If the app dies after the charge, the persisted machine is still in `awaiting_payment` with an `orderId`. On the next launch, the `(app)` layout's `useReconcilePendingCheckout(signedIn)` fetches the order and either completes the checkout or records `PAYMENT_FAILED`. Order status is server-owned (`OrderStatus` is never advanced by the client), which is what makes both paths recoverable.",
      rubric: [
        "network_drop: server marks paid, then the response fails",
        "pay() reports failed; the client's view is not the truth",
        "review.tsx re-reads the order from the server and finishes if isPaid",
        "Relaunch: persisted awaiting_payment + orderId lets useReconcilePendingCheckout ask the server",
        "Status is server-owned; the client never advances it",
      ],
      explain:
        "The general rule for money: the client reports what it *saw*, and the server decides what *happened*. Persisting the machine plus reconciling on launch turns \"killed mid-payment\" into a normal resume path, not a support ticket.",
    },
  ],
});
