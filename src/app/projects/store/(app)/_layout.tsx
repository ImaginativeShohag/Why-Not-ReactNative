import { type ErrorBoundaryProps, Stack } from "expo-router";

import { useSession } from "@/src/projects/store/auth/useSession";
import RouteErrorView from "@/src/projects/store/components/ui/RouteErrorView";
import { useReconcilePendingCheckout } from "@/src/projects/store/hooks/useCheckout";
import { useIntentReplay } from "@/src/projects/store/navigation/useIntentReplay";

export const unstable_settings = { initialRouteName: "(tab)" };

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <RouteErrorView {...props} group="app" />;
}

export default function AppLayout() {
  const { status } = useSession();
  const signedIn = status === "signedIn";

  useIntentReplay(status);
  // Relaunch after "paid but app killed": the server decides the outcome.
  useReconcilePendingCheckout(signedIn);

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="(tab)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ title: "" }} />
      <Stack.Screen
        name="products/[categoryId]"
        options={{ title: "Products" }}
      />
      <Stack.Screen name="wishlist" options={{ title: "Wishlist" }} />
      {/* Guests can browse; these need an account. */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="checkout/address" options={{ title: "Checkout" }} />
        <Stack.Screen
          name="checkout/shipping"
          options={{ title: "Checkout" }}
        />
        <Stack.Screen name="checkout/payment" options={{ title: "Checkout" }} />
        <Stack.Screen name="checkout/review" options={{ title: "Checkout" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Order" }} />
        <Stack.Screen name="orders" options={{ title: "Orders" }} />
      </Stack.Protected>
    </Stack>
  );
}
