import { forwardRef } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";

import Text from "./StoreText";
import {
  type StoreColors,
  useStoreColors,
  useStoreStyles,
} from "../../constants/theme";

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
  { label, error, backgroundColor, textColor, style, ...input },
  ref,
) {
  const colors = useStoreColors();
  const styles = useStoreStyles(createStyles);
  return (
    <View
      style={[
        styles.field,
        { backgroundColor: backgroundColor ?? colors.fill },
        error && styles.fieldError,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        accessibilityHint={error}
        style={[styles.input, { color: textColor ?? colors.label }, style]}
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

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    field: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 2,
    },
    fieldError: { borderWidth: 1, borderColor: c.danger },
    label: { fontSize: 13, color: c.muted },
    input: { fontSize: 17, paddingVertical: 4 },
    error: { fontSize: 13, color: c.danger, marginTop: 2 },
  });
