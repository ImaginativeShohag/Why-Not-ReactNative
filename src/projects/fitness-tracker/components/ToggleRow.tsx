import { StyleSheet, Switch, Text, View } from "react-native";

type Props = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  textColor: string;
  accent: string;
  hint?: string;
  mutedColor?: string;
};

export function ToggleRow({
  label,
  value,
  onChange,
  textColor,
  accent,
  hint,
  mutedColor,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        {hint ? (
          <Text style={[styles.hint, { color: mutedColor ?? textColor }]}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: accent }}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  label: { fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 12, marginTop: 2 },
});
