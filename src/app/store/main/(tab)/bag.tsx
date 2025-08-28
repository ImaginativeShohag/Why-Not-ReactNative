import { Text } from "react-native";
import { useNavigation } from "expo-router";
import { useEffect } from "react";

export default function BagScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: "Bag",
    });
  }, [navigation]);

  return <Text>Bag Screen</Text>;
}
