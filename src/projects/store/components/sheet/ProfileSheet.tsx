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

  // FakeStoreAPI answers unknown ids with an empty body, and a social or
  // signed-up demo session can share an id with someone else's profile. Only
  // show the profile when it is really this user's; the session identity and
  // Sign Out are always rendered.
  const profile =
    user && user.username === session.user?.username ? user : null;
  const name = profile
    ? `${profile.name.firstname} ${profile.name.lastname}`
    : (session.user?.displayName ?? session.user?.username ?? "Signed in");

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
      }
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: `https://picsum.photos/seed/${session.user?.id ?? 0}/200/200`,
          }}
          style={styles.avatar}
          accessibilityIgnoresInvertColors
          accessibilityLabel="Profile photo"
        />
      </View>

      {error && !profile ? (
        <ErrorStateView
          title="Couldn't load your profile"
          message={getErrorMessage(error) ?? "Couldn't load your profile."}
          onRetry={() => refetch()}
        />
      ) : null}

      <Text style={styles.sectionTitle}>Details</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <Text>{name}</Text>

        <Text style={styles.label}>Username</Text>
        <Text>{profile?.username ?? session.user?.username}</Text>

        {profile?.email || session.user?.email ? (
          <>
            <Text style={styles.label}>Email</Text>
            <Text>{profile?.email ?? session.user?.email}</Text>
          </>
        ) : null}

        {profile ? (
          <>
            <Text style={styles.label}>Phone</Text>
            <Text>{profile.phone}</Text>

            <Text style={styles.label}>Address</Text>
            <Text>{profile.address?.city}</Text>
          </>
        ) : null}
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
