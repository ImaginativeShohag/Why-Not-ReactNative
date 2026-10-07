import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/src/projects/store/auth/useSession";
import PrimaryButton from "@/src/projects/store/components/ui/PrimaryButton";
import { storeColors } from "@/src/projects/store/constants/theme";

const PAGES = [
  {
    icon: "bag-handle-outline",
    title: "Everything in one bag",
    body: "Your bag follows you across devices and survives a relaunch.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Checkout you can trust",
    body: "Secure payments, and you can pick up exactly where you left off.",
  },
  {
    icon: "notifications-outline",
    title: "Know where it is",
    body: "Optional order updates from placed to delivered.",
  },
] as const;

export default function OnboardingScreen() {
  const { completeOnboarding } = useSession();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {PAGES.map((p) => (
          <View key={p.title} style={[styles.page, { width }]} accessible>
            <Ionicons name={p.icon} size={72} color={storeColors.accent} />
            <Text style={styles.title} accessibilityRole="header">
              {p.title}
            </Text>
            <Text style={styles.body}>{p.body}</Text>
          </View>
        ))}
      </ScrollView>
      <View
        style={styles.dots}
        accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}
      >
        {PAGES.map((p, i) => (
          <View
            key={p.title}
            style={[styles.dot, i === page && styles.dotActive]}
          />
        ))}
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title="Get started"
          onPress={() => completeOnboarding()}
          testID="onboarding-start"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  body: {
    fontSize: 17,
    color: storeColors.secondaryText,
    textAlign: "center",
    lineHeight: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D1D1D6" },
  dotActive: { backgroundColor: storeColors.accent, width: 20 },
  footer: { padding: 16 },
});
