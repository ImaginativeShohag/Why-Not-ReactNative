# Project 03 · Store audit

The M1 deliverable from `docs/03-commerce-platform.html`. It records what the demo store looked like
before the production work, how urgent each gap was, and where it was fixed. Priorities: **P0** means
not shippable without it, **P1** means you'll lose users or data without it, **P2** is polish.

## Gaps

| # | Question | What the demo did | Priority | Fix (where it lives now) | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | What happens on a 401? | The request interceptor in `src/shared/api/axios.ts` was a commented-out stub, and there was no response interceptor. | P0 | `api/interceptors.ts`: on a 401, refresh once and replay the request once; if the refresh fails, sign out. `api/refreshCoordinator.ts`: single-flight refresh. Both are installed on store-owned instances (`api/client.ts`), never on the shared one. | Closed. `__tests__/refresh.test.ts`: six concurrent 401s cause one refresh. |
| 2 | Where does the token live? | Nowhere. `useLogin` returned the token and dropped it. | P0 | `auth/tokenStorage.ts`: the refresh token is in expo-secure-store with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. The access token is read from memory by the interceptor and also saved to secure-store, so a cold start can skip a refresh. Neither token is ever written to AsyncStorage. | Closed |
| 3 | Is login actually gated? | No. The splash redirected on a timer and nothing stopped a deep link going past it. | P0 | `src/app/projects/store/_layout.tsx`: `Stack.Protected` guards for onboarding, `(app)` and `(auth)`. The native splash stays up until the session resolves. The intent buffer (`navigation/pendingIntent.ts`) restores the page you were trying to reach after sign-in. | Closed |
| 4 | Are credentials hardcoded? | Yes: `constants/credentials.ts`. | P0 | File deleted. The sign-in screen has a dev-only "fill demo user" button instead. | Closed |
| 5 | Is the cart durable? | No. In-memory Zustand, empty on every relaunch. | P1 | `stores/cartStore.ts` is persisted with zustand + AsyncStorage. `stores/cartSync.ts` reconciles it with the server on sign-in using the `mergeCarts` rule (union by product, max quantity, server product data wins). | Closed. `__tests__/cartMath.test.ts` |
| 6 | Are query keys collision-safe? | No. Flat keys like `["products"]` and `["product", id]` don't share a prefix. | P1 | `utils/queryKeys.ts` is a nested factory under a `"store"` root, because one QueryClient is shared by every project in the app. | Closed |
| 7 | Is there a password in a query key? | `queryKeys.loginUser(credentials)` existed, though nothing used it. | P0 | Deleted. Login is a mutation. | Closed |
| 8 | How is the base URL chosen? | Hardcoded `https://fakestoreapi.com`. | P1 | `app.config.ts` sets `extra.storeApiUrl` per variant, read through `src/shared/constants/env.ts`. The shared axios instance has no base URL at all. | Closed |
| 9 | What does the orders screen do offline? | Showed a spinner forever. | P1 | `query/storeQuery.ts`: the query cache is persisted (store keys only), `onlineManager` is wired to expo-network, and an offline banner is shown with cached data instead of a spinner. | Closed |
| 10 | Is `useOrders` N+1? | Yes: fetch the cart, then fetch every product one by one. | P2 | `hooks/useOrders.ts` now resolves products from the cached catalogue (`ensureQueryData`), so it's one catalogue request instead of N detail requests. FakeStoreAPI has no join endpoint; a real backend should return order lines with product snapshots. | Mitigated |
| 11 | Does `axios.ts` belong to this project? | No. It's shared infra, but it carried store-shaped comments and a base URL. | P1 | It now holds only project-agnostic defaults (timeout and headers). The store derives its own instances and installs its interceptors from its own folder. | Closed |

## Added beyond the audit

| Area | Where | Notes |
| --- | --- | --- |
| Social sign-in | `auth/socialSignIn.ts` | Apple via expo-apple-authentication; Google via expo-auth-session with PKCE. If the user cancels, the screen returns to a clean state. Google is disabled when no `EXPO_PUBLIC_GOOGLE_*` client IDs are set. |
| Biometric re-auth | `auth/biometrics.ts`, `components/ui/LockView.tsx` | Optional. Lets a returning user in with Face ID / fingerprint. |
| Checkout | `checkout/checkoutMachine.ts`, `checkoutStore.ts` | An explicit, persisted state machine. Force-quit at any step and you resume where you were. There's one idempotency key per attempt, so a double tap can't create two orders. `__tests__/checkout.test.ts` |
| Payments | `hooks/usePayment.ts`, `api/payment.api.ts` | Stripe PaymentSheet when `EXPO_PUBLIC_STRIPE_KEY` and a backend are set; otherwise a clearly labelled simulated processor. The order status comes from the server, never from the client. |
| Mock backend | `api/mockServer.ts` | A persisted on-device stand-in, used when `EXPO_PUBLIC_STORE_BACKEND_URL` is empty. It has idempotency keys and server-owned status, so "kill after paying" behaves like a real server. |
| Push | `notifications/*` | The Android channel is created before the permission prompt; categories with Track / Reorder actions; badge handling; routing from all three delivery states. The tap listener starts at the root so a cold-start tap isn't lost. Permission is only requested from the signed-in store. |
| Universal links | `navigation/linkRoutes.ts`, `src/app/+native-intent.tsx`, `docs/well-known/` | `/p/<id>` opens the product, `/order/<id>` opens the order. Hosting the AASA and assetlinks files is a deployment step. |
| Observability | `utils/analytics.ts`, `utils/monitoring.ts` | A typed analytics event catalogue and a crash/performance wrapper. There's no vendor SDK yet; connecting one is a single change in each wrapper. |
| Error boundaries | `ErrorBoundary` exports in the `(app)`, `(app)/(tab)` and `(auth)` layouts | Each boundary has a retry action. |
| E2E | `.maestro/store-checkout.yaml` | Sign in, add to bag, check out with simulated payment. |

## Still open (needs accounts or infrastructure)

- **Crash reporting with source maps:** pick a vendor (Sentry, Bugsnag) and connect it in `utils/monitoring.ts`. Source-map upload belongs in the release pipeline.
- **Real backend:** refresh tokens, a server cart, orders, payment intents and push registration all run against `mockServer.ts` until `EXPO_PUBLIC_STORE_BACKEND_URL` points at a real server.
- **Universal links:** host the two files from `docs/well-known/` with the real Team ID and signing fingerprints.
- **Accessibility:** labels and roles are in place. The doc's manual VoiceOver/TalkBack pass, plus RTL and dynamic-type checks, still need a device.
