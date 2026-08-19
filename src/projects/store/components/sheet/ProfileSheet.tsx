import { useUserProfile } from "@/src/projects/store/hooks/useUser";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CURRENT_USER_ID = 1;

export default function ProfileSheet() {
  const router = useRouter();
  const { dismiss } = useBottomSheetModal();

  const {
    data: user,
    isPending,
    error,
    refetch,
    isRefetching,
  } = useUserProfile(CURRENT_USER_ID);

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

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !user) {
    return (
      <View style={styles.center}>
        <Text>{error.message}</Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
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
            <Text>{user.name.firstname + " " + user.name.lastname}</Text>

            <Text style={styles.label}>Username</Text>
            <Text>{user.username}</Text>

            <Text style={styles.label}>Email</Text>
            <Text>{user.email}</Text>

            <Text style={styles.label}>Phone</Text>
            <Text>{user.phone}</Text>

            <Text style={styles.label}>Address</Text>
            <Text>{user.address?.city}</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              dismiss();
              router.push("/projects/store/orders");
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
