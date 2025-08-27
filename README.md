# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

```bash
eas build --platform ios --profile development --local
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# Recommended Folder Structure

```
project-root/
├── src/
│   ├── app/                  # expo-router pages/screens
│   │   ├── (auth)/           # route group for authentication
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   ├── (tabs)/           # route group for tab navigation
│   │   │   ├── index.tsx
│   │   │   ├── profile.tsx
│   │   │   └── settings.tsx
│   │   ├── +not-found.tsx    # expo-router 404 screen
│   │   └── _layout.tsx       # global layout (navigation setup)
│   │
│   ├── components/           # reusable UI components
│   │   ├── common/           # small building blocks (Button, Text, etc.)
│   │   ├── layout/           # wrappers (Container, ScreenWrapper)
│   │   └── features/         # feature-specific components
│   │
│   ├── features/             # feature-based folders (scalable)
│   │   ├── auth/
│   │   │   ├── components/   # auth-specific UI
│   │   │   ├── hooks/        # useLogin, useRegister
│   │   │   ├── services/     # API calls (login, register)
│   │   │   └── store.ts      # Zustand/Redux slice for auth
│   │   ├── products/
│   │   ├── profile/
│   │   └── ...
│   │
│   ├── hooks/                # global reusable hooks
│   │   ├── useTheme.ts
│   │   ├── useAuth.ts
│   │   └── useNetwork.ts
│   │
│   ├── store/                # global Zustand/Redux stores
│   │   ├── cartStore.ts
│   │   └── userStore.ts
│   │
│   ├── services/             # API clients / networking
│   │   ├── apiClient.ts      # axios/fetch wrapper
│   │   ├── productService.ts
│   │   └── authService.ts
│   │
│   ├── utils/                # helpers / constants
│   │   ├── date.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   │
│   ├── assets/               # static assets (images, fonts, icons)
│   │   ├── fonts/
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── theme/                # styling/theme
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   └── typography.ts
│   │
│   └── types/                # TypeScript types/interfaces
│       ├── product.ts
│       ├── user.ts
│       └── index.ts
│
├── babel.config.js
├── app.json
├── package.json
└── tsconfig.json
```

### Why this structure?

-	`app/` → kept minimal, only route entry points (expo-router requirement).
-	`features/` → groups logic by feature (auth, products, profile), easier scaling.
-	`components/` → global reusable UI.
-	`store/` + `services/` → clear separation of state management and API calls.
-	`utils/` + `theme/` → centralized helpers and design tokens.
-	`types/` → strongly typed project.
