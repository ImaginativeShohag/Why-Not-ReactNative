import * as LocalAuthentication from "expo-local-authentication";

export async function isBiometricAvailable() {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(reason: string) {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Cancel",
      // Allow the device passcode as a fallback so a failed Face ID isn't a lockout.
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
