import {
  BottomSheetScrollView,
  useBottomSheetModal,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import { useSession } from "@/src/projects/store/auth/useSession";
import ErrorStateView from "@/src/projects/store/components/ui/ErrorStateView";
import { storeColors } from "@/src/projects/store/constants/theme";
import { useUserProfile } from "@/src/projects/store/hooks/useUser";

export default function ProfileSheet() {
  const router = useRouter();
  const { dismiss } = useBottomSheetModal();
  const session = useSession();

  const {
    data: user,
    isPending,
    error,
    refetch,
    isRefetching,
  } = useUserProfile(session.user?.id);

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
          dismiss();
          // Stack.Protected moves the user to /sign-in once the session clears.
          session.signOut();
        },
      },
    ]);
  };

  if (isPending && session.user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !user) {
    return (
      <ErrorStateView
        message={getErrorMessage(error) ?? "Couldn't load your profile."}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <BottomSheetScrollView
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
              accessibilityIgnoresInvertColors
              accessibilityLabel="Profile photo"
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
            accessibilityRole="button"
            onPress={() => {
              dismiss();
              router.push("/projects/store/orders");
            }}
          >
            <Text style={styles.buttonText}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.signOut]}
            accessibilityRole="button"
            onPress={handleSignOut}
          >
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </>
      )}
    </BottomSheetScrollView>
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
    backgroundColor: storeColors.accent,
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
