import { Text } from "react-native";
import { useNavigation } from "expo-router";
import { useEffect } from "react";

export default function CategoriesScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: "Categories",
    });
  }, [navigation]);

  return <Text>Categories Screen</Text>;
}
