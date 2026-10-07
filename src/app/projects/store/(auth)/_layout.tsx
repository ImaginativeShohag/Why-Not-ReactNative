import { type ErrorBoundaryProps, Stack } from "expo-router";

import RouteErrorView from "@/src/projects/store/components/ui/RouteErrorView";

export const unstable_settings = { initialRouteName: "sign-in" };

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <RouteErrorView {...props} group="auth" />;
}

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
      <Stack.Screen name="sign-up" options={{ title: "Create account" }} />
      <Stack.Screen name="forgot" options={{ title: "Reset password" }} />
    </Stack>
  );
}
