import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export const options = {
  headerShown: false,
};

export default function SplashScreen() {
  const router = useRouter();
  const [nextAction, setNextAction] = useState<"home" | "auth" | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNextAction("home");
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (nextAction === "home") {
      //router.replace("/projects/store/main");
      router.replace("/projects/store/login");
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
    ...StyleSheet.absoluteFill,
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
