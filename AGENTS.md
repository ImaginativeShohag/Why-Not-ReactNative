# AGENTS.md

This file provides detailed guidance for AI agents when working with code in this repository.

## Project Overview

This is a React Native code samples repository demonstrating various patterns, features, and best practices. The project serves as a collection of working examples showcasing modern React Native development techniques including navigation, state management, API integration, animations, and UI patterns.

**Key Tech Stack:**
- Expo SDK 57 with React Native 0.86.2
- React 19.2.3 with React Compiler enabled
- Expo Router for navigation (file-based routing with typed routes)
- TanStack Query (React Query) v5 for server state management
- Zustand v5 for client state management
- Axios for API calls
- React Native Reanimated & Gesture Handler for animations
- FakeStoreAPI for demonstration purposes

## Development Commands

### Running the App
```bash
npm start              # Start Expo dev server
npm run android        # Run on Android
npm run ios            # Run on iOS simulator
npm run web            # Run on web
```

### Code Quality
```bash
npm run lint           # Run ESLint
```

### Build
```bash
eas build --platform ios --profile development --local    # Local iOS build
```

### Utilities
```bash
npm run reset-project  # Moves starter code to app-example/ and creates blank app/
```

## Architecture & Code Organization

### Top-Level Shape

This repo is a **launcher plus a set of isolated sample projects**. `src/app/index.tsx` is a
Home screen listing every exercise; tapping a row pushes into that project's own stack. Each
project is a vertical slice — its routes, components, hooks, stores, api calls and models all
live under one project-named directory.

```
src/
├── app/        routes only (expo-router owns this tree)
├── assets/     images, fonts
├── projects/   per-project feature code (non-route)
├── shared/     generic infra used by more than one project or by the launcher
└── types/      global type declarations
```

The project registry lives in `src/shared/config/projects.ts` — a typed array the Home screen
maps over. Home has no hardcoded knowledge of any individual project. See
`docs/00-launcher-restructure.html` for the rationale and current open items.

### Routing Structure (expo-router)
Examples of Expo Router patterns with file-based routing in `src/app/`:
- `src/app/_layout.tsx` - Root layout demonstrating provider setup (QueryProvider, ThemeProvider, SafeAreaProvider, GestureHandlerRootView) and one `Stack.Screen` per route
- `src/app/index.tsx` - Home / launcher list, rendered from the project registry
- `src/app/projects/store/splash/index.tsx` - The store's own entry route; redirects to login after a delay
- `src/app/projects/store/login/index.tsx` - Login form example (React Query mutation)
- `src/app/projects/store/main/(tab)/` - Route groups example with tab navigation (home, categories, bag)
- `src/app/projects/store/products/[categoryId].tsx` - Dynamic route example with parameters
- `src/app/projects/store/product-details/[productId].tsx` - Nested dynamic route example
- `src/app/projects/store/orders/index.tsx` - Standard screen route
- `src/app/projects/store/place-order/index.tsx` - Form/checkout flow example
- `src/app/projects/tic-tac-toe/index.tsx` - Zustand `combine` middleware example (self-contained)
- `src/app/projects/{offline-journal,camera-social,fitness-tracker,podcast-player}/index.tsx` - "Coming soon" stubs for projects not yet built

**Route naming convention:** each screen is a folder containing `index.tsx`, so the route path
is the folder path — `store/orders/index.tsx` is the route `projects/store/orders`. A
`Stack.Screen name=` value must match that derived path exactly; verify against the file tree
when adding screens rather than trusting typed routes alone to catch a mismatch.

**Routes come from the file tree, not from `Stack.Screen` declarations.** Any file under
`src/app/` is a reachable route whether or not you declare it — omitting a declaration only
leaves it with a path-derived header title. So a non-route component (a sheet body, a list row)
must live *outside* `src/app/` entirely. This is why `ProfileSheet` sits in the store's slice at
`src/projects/store/components/sheet/ProfileSheet.tsx`: as a route it crashed, because
`useBottomSheetModal()` throws when rendered outside the `BottomSheetModalProvider` that only
the tab layout mounts.

### State Management

**Zustand (Client State Example):**
- `src/projects/store/stores/cartStore.ts` - Shopping cart state example demonstrating Zustand patterns with add/remove/update/clear actions
- `src/projects/store/stores/cartSelectors.ts` - Derived selectors example for computed state (total price, item count, etc.)
- `src/app/projects/tic-tac-toe/index.tsx` - Zustand `combine` middleware example, store declared inline

**TanStack Query (Server State Example):**
- All API data fetching examples use React Query hooks in `src/projects/store/hooks/` (`useProduct.ts`, `useAuth.ts`, `useUser.ts`)
- Query keys are centralized per project in `src/projects/store/utils/queryKeys.ts` to demonstrate best practices
- A single `QueryProvider` wraps the whole app in `src/app/_layout.tsx`; the provider itself lives at `src/shared/providers/QueryProvider.tsx`. Mount it **once** — nesting a second instance creates a second independent cache.

### API Layer

**Structure (Example Patterns):**
- `src/shared/api/axios.ts` - Shared axios instance with base URL, timeout, and interceptors; every project's endpoint files import it
- `src/projects/store/api/product.api.ts` - Product/cart API functions demonstrating REST endpoint patterns
- `src/projects/store/api/auth.api.ts` - Login endpoint
- `src/projects/store/api/user.api.ts` - User profile endpoint

**Naming Convention (Used in Examples):**
- GET → `fetchX` (e.g., `fetchProducts`, `fetchProductDetails`)
- POST (create) → `createX` or action verb (e.g., `loginUser`)
- PUT/PATCH → `updateX`
- DELETE → `deleteX`

### Data Models
TypeScript types/interfaces examples in `src/projects/store/models/`:
- `Product.ts` - Product and Category types
- `Auth.ts` - Authentication payload examples
- `CartItem.ts` - Cart item type examples
- `User.ts` - User profile type

### Components Structure
- `src/shared/components/` - Generic primitives (`themed-text`, `themed-view`)
- `src/shared/components/ui/` - Generic UI primitives (`icon-symbol` with its `.ios` variant, `content-unavailable-view`, `ComingSoonView`)
- `src/projects/store/components/` - Store-only components (`SlideItem`)
- `src/projects/store/components/sheet/` - Store-only bottom-sheet bodies (`ProfileSheet`)
- `src/projects/store/components/ui/` - Store-only UI (`cart-footer`, `cart-item`, `product-image`, `product-item`, `background-view`)

**Component Philosophy (Demonstrated):**
- Components are "dummy" and reusable (no ViewModels passed to components)
- Platform-specific components use `.ios.tsx` or `.android.tsx` extensions (see icon-symbol examples)
- Theme-aware components use `useThemeColor` hook
- Nothing under `src/app/` is a component home — that tree is routes only

### Hooks
Example hooks demonstrating various patterns:
- `src/projects/store/hooks/useProduct.ts` - React Query hooks examples for product/cart/order operations
- `src/projects/store/hooks/useAuth.ts` - Login mutation + error-message mapping (login is a side effect, so a mutation — not a query)
- `src/projects/store/hooks/useUser.ts` - User profile query
- `src/projects/store/hooks/useComponentHeight.ts` - Component dimension tracking example
- `src/shared/hooks/use-theme-color.ts` - Theme color utilities example
- `src/shared/hooks/use-color-scheme.ts` - Color scheme detection (with `.web.ts` platform variant)

### Theme & Styling
Examples of theming patterns:
- `src/shared/constants/theme.ts` - Theme definitions and colors
- Dark/Light mode support demonstrated through React Navigation themes
- `ColorSchemeName` includes `"unspecified"`, so narrow before indexing: `colorScheme === "dark" ? "dark" : "light"`

### SVG Configuration
Metro bundler is configured to transform SVG files as React components:
- SVG files are imported as components using `react-native-svg-transformer`
- Regular images go through standard asset pipeline

### Path Aliases
TypeScript path alias `@/*` maps to project root, so imports use:
```typescript
import { useCartStore } from "@/src/projects/store/stores/cartStore";
```

## Important Patterns

### Query Keys Pattern
React Query keys are centralized and follow a hierarchical structure (see `src/projects/store/utils/queryKeys.ts`):
```typescript
queryKeys.products              // All products
queryKeys.product(id)           // Single product
queryKeys.productsByCategory(cat) // Filtered products
queryKeys.orders(userId)        // User orders
```

### Cart Management Example
Cart state demonstrates Zustand patterns with local state management:
- `addToCart(product)` - Adds or increments quantity
- `removeFromCart(id)` - Removes item completely
- `updateQuantity(id, delta)` - Increments/decrements (filters out zero quantities)
- `clearCart()` - Empties cart

### Async Data Flow Pattern
Demonstrates a clean separation of concerns:
1. API functions in `src/projects/store/api/product.api.ts` make raw HTTP calls
2. React Query hooks in `src/projects/store/hooks/useProduct.ts` wrap API functions with caching/loading states
3. Components consume hooks and render UI based on `data`, `isLoading`, `error`

### Orders Implementation Example
The `useOrders` hook demonstrates a complex data fetching pattern: fetches cart data, then enriches it with full product details by fetching each product individually, creating a "DetailedCartItem" with complete information.

## Expo Configuration

**New Architecture:** On by default in SDK 57 — there is no `newArchEnabled` flag in app.json.

**React Compiler:** Enabled via `experiments.reactCompiler: true`

**Typed Routes:** Enabled via `experiments.typedRoutes: true` for type-safe navigation examples

**Plugins:**
- expo-router (file-based navigation)
- expo-splash-screen (custom splash configuration)
- expo-web-browser (in-app browser support)
- expo-font, expo-image, expo-status-bar

## Development Notes

- Uses React 19.2.3 with React Native 0.86.2 (cutting edge versions for demonstration)
- React Native Reanimated v4 configured for advanced animation examples
- @shopify/flash-list v2 demonstrated for performant list rendering
- @gorhom/bottom-sheet v5 available for bottom sheet modal examples
- Expo Symbols (SF Symbols on iOS) used for icon examples
- Expo Router has **no route-level `options` export**. Set screen options from the parent
  layout's `Stack.Screen`, an inline `<Stack.Screen options={...} />`, or
  `navigation.setOptions()`. An `export const options = {...}` in a route file is silently ignored.

## Testing & Linting

- ESLint is configured with `expo lint` command
- ESLint uses `eslint-config-expo` with Prettier integration
- React Compiler plugin is included for lint checks

## Path Configuration

All source code is in `src/`. There are only two homes for non-route code — a
project slice or `shared` — and no "misc" folder:

| Path | Holds |
| --- | --- |
| `src/app/` | Routes only (expo-router) |
| `src/assets/` | Images, fonts |
| `src/projects/<slug>/` | One project's feature code: `api/`, `components/`, `constants/`, `hooks/`, `models/`, `stores/`, `utils/` |
| `src/shared/` | Generic infra: `api/`, `components/`, `config/`, `constants/`, `hooks/`, `providers/` |
| `src/types/` | Global type declarations |

Only `store` has a populated slice today; the other projects get one when they are built.

### Isolation Rules

1. **No cross-project imports.** Nothing in `src/projects/camera-social/` may import from
   `src/projects/store/`, ever. If two projects need the same thing, promote it to
   `src/shared/` deliberately — don't copy-paste and don't reach across.
2. **Shared stays small.** Only promote a file to `src/shared/` when a *second* project
   actually needs it.
3. **Each project owns its own query keys, Zustand stores, and API endpoint files.** There is
   no shared `queryKeys.ts`.
4. **Components stay dumb.** A component never assumes it is running inside a specific
   project's provider tree unless it lives in that project.

## Environment

- Bundle identifier (iOS): `org.imaginativeworld.whynotreactnative`
- Package name (Android): `org.imaginativeworld.whynotreactnative`
- URL scheme: `whynotreactnative://`
- EAS Project ID: `14c49066-d1a8-4fd8-a15b-4d290153a787`
