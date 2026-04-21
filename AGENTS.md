# AGENTS.md

This file provides detailed guidance for AI agents when working with code in this repository.

## Project Overview

This is a React Native code samples repository demonstrating various patterns, features, and best practices. The project serves as a collection of working examples showcasing modern React Native development techniques including navigation, state management, API integration, animations, and UI patterns.

**Key Tech Stack:**
- Expo SDK 54 (preview) with React Native 0.81.1
- React 19.1.0 with React Compiler enabled
- Expo Router for navigation (file-based routing with typed routes)
- TanStack Query (React Query) for server state management
- Zustand for client state management
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

### Routing Structure (expo-router)
Examples of Expo Router patterns with file-based routing in `src/app/`:
- `src/app/_layout.tsx` - Root layout demonstrating provider setup (QueryProvider, ThemeProvider, SafeAreaProvider)
- `src/app/index.tsx` - Entry/landing screen example
- `src/app/store/main/(tab)/` - Route groups example with tab navigation (home, categories, bag)
- `src/app/store/products/[categoryId].tsx` - Dynamic route example with parameters
- `src/app/store/product-details/[productId].tsx` - Nested dynamic route example
- `src/app/store/orders/orders.tsx` - Standard screen route
- `src/app/store/profile/profile.tsx` - Profile screen with bottom sheet example
- `src/app/store/place-order/place-order.tsx` - Form/checkout flow example

### State Management

**Zustand (Client State Example):**
- `src/stores/cartStore.ts` - Shopping cart state example demonstrating Zustand patterns with add/remove/update/clear actions
- `src/stores/cartSelectors.ts` - Derived selectors example for computed state (total price, item count, etc.)

**TanStack Query (Server State Example):**
- All API data fetching examples use React Query hooks defined in `src/hooks/useProduct.ts`
- Query keys are centralized in `src/utils/queryKeys.ts` to demonstrate best practices
- QueryProvider wraps the app in `src/providers/QueryProvider.tsx`

### API Layer

**Structure (Example Patterns):**
- `src/api/axios.ts` - Axios instance configuration example with base URL, timeout, and interceptors
- `src/api/endpoints/product.api.ts` - API functions demonstrating REST endpoint patterns

**Naming Convention (Used in Examples):**
- GET → `fetchX` (e.g., `fetchProducts`, `fetchProductDetails`)
- POST (create) → `createX` or action verb (e.g., `loginUser`)
- PUT/PATCH → `updateX`
- DELETE → `deleteX`

### Data Models
TypeScript types/interfaces examples in `src/models/`:
- `Product.ts` - Product and Category types
- `Auth.ts` - Authentication payload examples
- `CartItem.ts` - Cart item type examples

### Components Structure
- `src/components/ui/` - Reusable UI component examples (cart-item, product-item, product-image, icon-symbol, etc.)
- `src/components/` - General component examples (parallax-scroll-view, themed-text, themed-view, collapsible, etc.)

**Component Philosophy (Demonstrated):**
- Components are "dummy" and reusable (no ViewModels passed to components)
- Platform-specific components use `.ios.tsx` or `.android.tsx` extensions (see icon-symbol examples)
- Theme-aware components use `useThemeColor` hook

### Hooks
Example hooks demonstrating various patterns:
- `src/hooks/useProduct.ts` - React Query hooks examples for API operations
- `src/hooks/use-theme-color.ts` - Theme color utilities example
- `src/hooks/use-color-scheme.ts` - Color scheme detection (with `.web.ts` platform variant)
- `src/hooks/useComponentHeight.ts` - Component dimension tracking example

### Theme & Styling
Examples of theming patterns:
- `src/constants/theme.ts` - Theme definitions and colors
- Dark/Light mode support demonstrated through React Navigation themes

### SVG Configuration
Metro bundler is configured to transform SVG files as React components:
- SVG files are imported as components using `react-native-svg-transformer`
- Regular images go through standard asset pipeline

### Path Aliases
TypeScript path alias `@/*` maps to project root, so imports use:
```typescript
import { useCartStore } from "@/src/stores/cartStore";
```

## Important Patterns

### Query Keys Pattern
React Query keys are centralized and follow a hierarchical structure (see `src/utils/queryKeys.ts`):
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
1. API functions in `src/api/endpoints/product.api.ts` make raw HTTP calls
2. React Query hooks in `src/hooks/useProduct.ts` wrap API functions with caching/loading states
3. Components consume hooks and render UI based on `data`, `isLoading`, `error`

### Orders Implementation Example
The `useOrders` hook demonstrates a complex data fetching pattern: fetches cart data, then enriches it with full product details by fetching each product individually, creating a "DetailedCartItem" with complete information.

## Expo Configuration

**New Architecture Enabled:** `newArchEnabled: true` in app.json (demonstrates React Native's new architecture)

**React Compiler:** Experimental React Compiler is enabled (`reactCompiler: true`)

**Typed Routes:** Expo Router typed routes enabled for type-safe navigation examples

**Plugins:**
- expo-router (file-based navigation)
- expo-splash-screen (custom splash configuration)
- expo-web-browser (in-app browser support)

## Development Notes

- Uses React 19.1.0 with React Native 0.81.1 (cutting edge versions for demonstration)
- React Native Reanimated configured for advanced animation examples
- @shopify/flash-list demonstrated for performant list rendering
- @gorhom/bottom-sheet available for bottom sheet modal examples
- Expo Symbols (SF Symbols on iOS) used for icon examples

## Testing & Linting

- ESLint is configured with `expo lint` command
- ESLint uses `eslint-config-expo` with Prettier integration
- React Compiler plugin is included for lint checks

## Path Configuration

All source code is in `src/` directory:
- Assets: `src/assets/` (images, fonts)
- App routes: `src/app/`
- Components: `src/components/`
- API layer: `src/api/`
- State: `src/stores/`
- Hooks: `src/hooks/`
- Models: `src/models/`
- Utils: `src/utils/`
- Constants: `src/constants/`

## Environment

- Bundle identifier (iOS): `org.imaginativeworld.whynotreactnative`
- Package name (Android): `org.imaginativeworld.whynotreactnative`
- URL scheme: `whynotreactnative://`
- EAS Project ID: `14c49066-d1a8-4fd8-a15b-4d290153a787`
