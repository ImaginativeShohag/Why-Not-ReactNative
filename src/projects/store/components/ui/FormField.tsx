import { forwardRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { storeColors } from "../../constants/theme";

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  backgroundColor?: string;
  textColor?: string;
};

/**
 * Labelled input with an inline error. Everything else (textContentType,
 * autoComplete, keyboardType, returnKeyType) passes straight through so each
 * screen sets the correct OS autofill hints.
 */
const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  {
    label,
    error,
    backgroundColor = "rgba(120,120,128,0.12)",
    textColor = "#000",
    style,
    ...input
  },
  ref,
) {
  return (
    <View
      style={[styles.field, { backgroundColor }, error && styles.fieldError]}
    >
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={storeColors.muted}
        accessibilityLabel={label}
        accessibilityHint={error}
        style={[styles.input, { color: textColor }, style]}
        {...input}
      />
      {error ? (
        <Text
          style={styles.error}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          ⚠ {error}
        </Text>
      ) : null}
    </View>
  );
});

export default FormField;

const styles = StyleSheet.create({
  field: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 2,
  },
  fieldError: { borderWidth: 1, borderColor: storeColors.danger },
  label: { fontSize: 13, color: storeColors.muted },
  input: { fontSize: 17, paddingVertical: 4 },
  error: { fontSize: 13, color: storeColors.danger, marginTop: 2 },
});
