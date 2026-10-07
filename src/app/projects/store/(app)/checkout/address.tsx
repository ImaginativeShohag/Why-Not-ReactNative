import { Redirect, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  type TextInput,
  View,
} from "react-native";

import {
  SUPPORTED_COUNTRIES,
  validateAddress,
} from "@/src/projects/store/checkout/validation";
import CheckoutScaffold from "@/src/projects/store/components/checkout/CheckoutScaffold";
import FormField from "@/src/projects/store/components/ui/FormField";
import PrimaryButton from "@/src/projects/store/components/ui/PrimaryButton";
import SectionHeader from "@/src/projects/store/components/ui/SectionHeader";
import {
  CHECKOUT_STEP_LABELS,
  useCheckout,
  useCheckoutGuard,
} from "@/src/projects/store/hooks/useCheckout";
import {
  type Address,
  type AddressField,
  EMPTY_ADDRESS,
} from "@/src/projects/store/models/Address";
import { storeColors } from "@/src/projects/store/constants/theme";

export default function CheckoutAddressScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const redirect = useCheckoutGuard("address");
  const { checkout, send } = useCheckout();

  // Draft lives in screen state; only a valid address is committed to the
  // (persisted) machine on Continue.
  const [draft, setDraft] = useState<Address>(
    checkout.address ?? EMPTY_ADDRESS,
  );
  const [saveAddress, setSaveAddress] = useState(checkout.saveAddress);
  const [touched, setTouched] = useState<
    Partial<Record<AddressField, boolean>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  // One const per ref: reading refs off an object during render trips the
  // React Compiler ("cannot access refs during render").
  const line1Ref = useRef<TextInput>(null);
  const line2Ref = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const regionRef = useRef<TextInput>(null);
  const postalCodeRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  // A placed (locked) order never renders this step: the guard sends it to
  // review, which owns the "finish payment" state.
  if (redirect) return <Redirect href={redirect} />;

  const allErrors = validateAddress(draft);
  const errorFor = (field: AddressField) =>
    submitted || touched[field] ? allErrors[field] : undefined;

  const set = (field: AddressField) => (value: string) =>
    setDraft((d) => ({ ...d, [field]: value }));
  const blur = (field: AddressField) => () =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleContinue = () => {
    setSubmitted(true);
    if (Object.keys(allErrors).length > 0) return;
    send({ type: "SUBMIT_ADDRESS", address: draft, saveAddress });
    router.push("/projects/store/checkout/shipping");
  };

  return (
    <CheckoutScaffold
      stepLabels={CHECKOUT_STEP_LABELS}
      currentIndex={0}
      keyboardOffset={headerHeight}
      footer={
        <PrimaryButton
          title="Continue to shipping"
          onPress={handleContinue}
          testID="checkout-address-continue"
        />
      }
    >
      <SectionHeader title="Shipping address" />
      {/* textContentType (iOS) + autoComplete (Android) = OS address autofill. */}
      <FormField
        label="Full name"
        value={draft.fullName}
        onChangeText={set("fullName")}
        onBlur={blur("fullName")}
        error={errorFor("fullName")}
        textContentType="name"
        autoComplete="name"
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => line1Ref.current?.focus()}
        testID="address-name"
      />
      <FormField
        ref={line1Ref}
        label="Street address"
        value={draft.line1}
        onChangeText={set("line1")}
        onBlur={blur("line1")}
        error={errorFor("line1")}
        textContentType="streetAddressLine1"
        autoComplete="address-line1"
        returnKeyType="next"
        onSubmitEditing={() => line2Ref.current?.focus()}
        testID="address-line1"
      />
      <FormField
        ref={line2Ref}
        label="Apartment, suite (optional)"
        value={draft.line2 ?? ""}
        onChangeText={set("line2")}
        textContentType="streetAddressLine2"
        autoComplete="address-line2"
        returnKeyType="next"
        onSubmitEditing={() => cityRef.current?.focus()}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <FormField
            ref={cityRef}
            label="City"
            value={draft.city}
            onChangeText={set("city")}
            onBlur={blur("city")}
            error={errorFor("city")}
            textContentType="addressCity"
            autoComplete="postal-address-locality"
            returnKeyType="next"
            onSubmitEditing={() => regionRef.current?.focus()}
            testID="address-city"
          />
        </View>
        <View style={styles.flex}>
          <FormField
            ref={regionRef}
            label="State / region"
            value={draft.region ?? ""}
            onChangeText={set("region")}
            textContentType="addressState"
            autoComplete="postal-address-region"
            returnKeyType="next"
            onSubmitEditing={() => postalCodeRef.current?.focus()}
          />
        </View>
      </View>
      <FormField
        ref={postalCodeRef}
        label="Postal code"
        value={draft.postalCode}
        onChangeText={set("postalCode")}
        onBlur={blur("postalCode")}
        error={errorFor("postalCode")}
        textContentType="postalCode"
        autoComplete="postal-code"
        autoCapitalize="characters"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        testID="address-postal"
      />

      <Text style={styles.label}>Country</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {SUPPORTED_COUNTRIES.map((c) => (
          <Pressable
            key={c.code}
            onPress={() => set("country")(c.code)}
            accessibilityRole="radio"
            accessibilityLabel={c.name}
            accessibilityState={{ checked: draft.country === c.code }}
            style={[styles.chip, draft.country === c.code && styles.chipActive]}
          >
            <Text
              style={
                draft.country === c.code
                  ? styles.chipTextActive
                  : styles.chipText
              }
            >
              {c.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {errorFor("country") ? (
        <Text style={styles.error}>{errorFor("country")}</Text>
      ) : null}

      <SectionHeader title="Contact" />
      <FormField
        ref={phoneRef}
        label="Phone (for delivery)"
        value={draft.phone ?? ""}
        onChangeText={set("phone")}
        onBlur={blur("phone")}
        error={errorFor("phone")}
        textContentType="telephoneNumber"
        autoComplete="tel"
        keyboardType="phone-pad"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <FormField
        ref={emailRef}
        label="Email (for receipt)"
        value={draft.email ?? ""}
        onChangeText={set("email")}
        onBlur={blur("email")}
        error={errorFor("email")}
        textContentType="emailAddress"
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={handleContinue}
      />

      <View style={styles.switchRow}>
        <Text style={styles.flex}>Save for next time</Text>
        <Switch
          value={saveAddress}
          onValueChange={setSaveAddress}
          accessibilityLabel="Save address for next time"
        />
      </View>
    </CheckoutScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: 12 },
  label: { fontSize: 13, color: storeColors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(120,120,128,0.12)",
  },
  chipActive: { backgroundColor: storeColors.accent },
  chipText: { fontSize: 14 },
  chipTextActive: { fontSize: 14, color: "#fff", fontWeight: "600" },
  error: { color: storeColors.danger, fontSize: 13 },
  switchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
});
