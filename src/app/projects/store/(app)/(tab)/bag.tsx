import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useSession } from "@/src/projects/store/auth/useSession";
import {
  isLocked,
  resumeStep,
} from "@/src/projects/store/checkout/checkoutMachine";
import { useCheckoutStore } from "@/src/projects/store/checkout/checkoutStore";
import { checkPromo } from "@/src/projects/store/checkout/pricing";
import CartFooter from "@/src/projects/store/components/ui/cart-footer";
import CartItemView from "@/src/projects/store/components/ui/cart-item";
import { useStartCheckout } from "@/src/projects/store/hooks/useCheckout";
import { useComponentHeight } from "@/src/projects/store/hooks/useComponentHeight";
import { setPendingIntent } from "@/src/projects/store/navigation/pendingIntent";
import {
  lineTotalCents,
  MAX_QUANTITY_PER_ITEM,
  subtotalCents,
} from "@/src/projects/store/stores/cartMath";
import { useCartStore } from "@/src/projects/store/stores/cartStore";
import { track } from "@/src/projects/store/utils/analytics";
import { formatMoney, formatPrice } from "@/src/projects/store/utils/money";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";
import { storeColors } from "@/src/projects/store/constants/theme";

const CHECKOUT_PATH = "/projects/store/checkout";

export default function BagScreen() {
  const router = useRouter();
  const footer = useComponentHeight();
  const session = useSession();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const startCheckout = useStartCheckout();
  const promoCode = useCheckoutStore((s) => s.promoCode);
  // Same predicate the machine uses to refuse APPLY_PROMO: an order is placed
  // and awaiting payment. A completed checkout unlocks the next one.
  const promoLocked = useCheckoutStore(isLocked);
  const send = useCheckoutStore((s) => s.send);

  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const subtotal = subtotalCents(items);

  if (items.length === 0) {
    return (
      <ContentUnavailableView
        iconComponent={Ionicons}
        iconName="bag-outline"
        title="Your bag is empty"
        description="Add some products to continue."
      />
    );
  }

  const applyPromo = () => {
    // The keyboard's submit bypasses the disabled Apply button.
    if (promoLocked) return;
    const check = checkPromo(promoInput, subtotal);
    track("apply_promo", {
      code: promoInput.trim().toUpperCase(),
      valid: check.valid,
    });
    if (check.valid) {
      send({ type: "APPLY_PROMO", code: check.promo.code });
      setPromoMessage(
        `${check.promo.code} applied — see the discount at checkout.`,
      );
      setPromoInput("");
    } else {
      setPromoMessage(check.reason);
    }
  };

  const handleCheckout = () => {
    track("begin_checkout", {
      item_count: items.length,
      value_cents: subtotal,
    });
    if (session.status !== "signedIn") {
      // Keep the intent: after sign-in the (app) layout lands them in checkout.
      setPendingIntent(`${CHECKOUT_PATH}/address`);
      router.push("/projects/store/sign-in");
      return;
    }
    startCheckout();
    // Resume at the furthest valid step of an interrupted checkout.
    const step = resumeStep(useCheckoutStore.getState());
    send({ type: "GO_TO", step });
    router.push(`${CHECKOUT_PATH}/${step}`);
  };

  return (
    <View style={styles.flex}>
      <FlashList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          padding: 12,
          paddingBottom: footer.height + 12,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={
          <View style={styles.promo}>
            {promoCode ? (
              <View style={styles.promoApplied}>
                <Text style={styles.promoAppliedText}>
                  Code {promoCode} applied
                </Text>
                {!promoLocked ? (
                  <Pressable
                    onPress={() => send({ type: "APPLY_PROMO", code: null })}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove code ${promoCode}`}
                  >
                    <Text style={styles.link}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={styles.promoRow}>
                <TextInput
                  value={promoInput}
                  onChangeText={setPromoInput}
                  placeholder="Promo code"
                  placeholderTextColor={storeColors.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="promo-code"
                  returnKeyType="done"
                  onSubmitEditing={applyPromo}
                  style={styles.promoInput}
                  accessibilityLabel="Promo code"
                />
                <Pressable
                  onPress={applyPromo}
                  disabled={!promoInput.trim() || promoLocked}
                  accessibilityRole="button"
                  style={styles.applyButton}
                >
                  <Text style={styles.link}>Apply</Text>
                </Pressable>
              </View>
            )}
            {promoMessage ? (
              <Text
                style={styles.promoMessage}
                accessibilityLiveRegion="polite"
              >
                {promoMessage}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <CartItemView
            title={item.title}
            price={formatPrice(item.price)}
            lineTotal={formatMoney(lineTotalCents(item))}
            image={item.image}
            quantity={item.quantity}
            plusDisabled={item.quantity >= MAX_QUANTITY_PER_ITEM}
            onPlusClick={() => updateQuantity(item.id, 1)}
            onMinusClick={() => {
              if (item.quantity === 1)
                track("remove_from_cart", { product_id: item.id });
              updateQuantity(item.id, -1);
            }}
          />
        )}
      />

      <View style={styles.footerContainer} onLayout={footer.onLayout}>
        <BlurView>
          <CartFooter
            total={formatMoney(subtotal)}
            ctaLabel={
              session.status === "signedIn"
                ? "Check out"
                : "Sign in to check out"
            }
            onCheckout={handleCheckout}
          />
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footerContainer: { position: "absolute", bottom: 0, left: 0, right: 0 },
  promo: { marginTop: 16, gap: 6 },
  promoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  promoInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  applyButton: { padding: 8 },
  promoApplied: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(52,199,89,0.12)",
    padding: 12,
    borderRadius: 12,
  },
  promoAppliedText: { color: storeColors.successText, fontWeight: "600" },
  promoMessage: { fontSize: 13, color: storeColors.secondaryText },
  link: { color: storeColors.accent, fontWeight: "600", fontSize: 15 },
});
