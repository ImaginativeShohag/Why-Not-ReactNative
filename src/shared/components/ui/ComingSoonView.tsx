import { Text, View } from "react-native";

type ComingSoonScreenProps = {
  title: string;
};

export default function ComingSoonScreen({ title }: ComingSoonScreenProps) {
  return (
    <View style={{ flex: 1, alignContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 16 }}>{title}</Text>
      <View style={{ height: 16 }} />
      <Text>Coming Soon...</Text>
    </View>
  );
}
