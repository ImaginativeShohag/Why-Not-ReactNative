import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Button,
  Alert,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";

type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  address?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { dismiss } = useBottomSheetModal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulated API call
      await new Promise((r) => setTimeout(r, 1000));
      setUser({
        id: 1,
        name: "John Doe",
        username: "johnd",
        email: "john@example.com",
        phone: "+123456789",
        address: "123 Main St, NY",
      });
    } catch (e) {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUser();
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Sign out from Store?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          // Clear auth and redirect
          // router.reset({
          //   index: 0,
          //   routes: [{ name: "Login" as never }],
          // });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
        <Button title="Retry" onPress={fetchUser} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {user && (
        <>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: `https://picsum.photos/seed/${user.id}/200/200` }}
              style={styles.avatar}
            />
          </View>

          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Name</Text>
            <Text>{user.name}</Text>

            <Text style={styles.label}>Username</Text>
            <Text>{user.username}</Text>

            <Text style={styles.label}>Email</Text>
            <Text>{user.email}</Text>

            <Text style={styles.label}>Phone</Text>
            <Text>{user.phone}</Text>

            <Text style={styles.label}>Address</Text>
            <Text>{user.address ?? "-"}</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              dismiss();
              router.push("/store/orders/orders");
            }}
          >
            <Text style={styles.buttonText}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.signOut]}
            onPress={handleSignOut}
          >
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  sectionTitle: {
    marginBottom: 8,
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
  },
  button: {
    padding: 12,
    backgroundColor: "#007bff",
    borderRadius: 6,
    marginVertical: 8,
    alignItems: "center",
  },
  signOut: {
    backgroundColor: "red",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
