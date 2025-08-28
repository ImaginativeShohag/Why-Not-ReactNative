import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SplashScreen() {
  const router = useRouter();
  const [nextAction, setNextAction] = useState<"auth" | "home" | null>(null);

  // Simulate viewModel.checkNextAction()
  useEffect(() => {
    const timer = setTimeout(() => {
      // Mock condition
      const isLoggedIn = true;
      setNextAction(isLoggedIn ? "home" : "auth");
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (nextAction === "auth") {
      //router.replace("/login");
    } else if (nextAction === "home") {
      router.replace("/store/main");
    }
  }, [nextAction, router]);

  return (
    <LinearGradient
      colors={["purple", "blue"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={styles.welcome}>Welcome to</Text>
        <Text style={styles.title}>Store Overflow</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,0,0,0.15)", // simple mesh-like overlay
  },
  content: {
    alignItems: "center",
    padding: 16,
  },
  welcome: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
});
