import { Alert } from "react-native";

/** Show a caught error to the user under `title`. */
export function alertError(title: string, error: unknown) {
  Alert.alert(title, error instanceof Error ? error.message : String(error));
}
