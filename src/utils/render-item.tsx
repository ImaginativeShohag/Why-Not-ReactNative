import { SlideItem } from "@/src/components/SlideItem";
import { Link } from "expo-router";
import { ImageStyle, Pressable, StyleProp } from "react-native";
import { CarouselRenderItem } from "react-native-reanimated-carousel";

interface Options {
  rounded?: boolean;
  style?: StyleProp<ImageStyle>;
}

export const renderCarouselItem = ({
  rounded = false,
  style,
}: Options = {}): CarouselRenderItem<any> => {
  const Item: CarouselRenderItem<any> = ({ index, item }) => (
    <Link
      style={{
        flex: 1,
      }}
      href={{
        pathname: "/store/product-details/[productId]",
        params: { productId: item.id },
      }}
      asChild
    >
      <Pressable
        style={({ pressed }) => [
          {
            flex: 1,
            opacity: pressed ? 0.2 : 1.0,
          },
        ]}
      >
        <SlideItem
          key={index}
          index={index}
          item={item}
          rounded={rounded}
          style={style}
          source={item.image}
        />
      </Pressable>
    </Link>
  );

  // Manually assign display name for ESLint / DevTools
  (Item as any).displayName = "CarouselItem";

  return Item;
};
