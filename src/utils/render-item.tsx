import { SlideItem } from "@/src/components/SlideItem";
import { ImageStyle, StyleProp } from "react-native";
import { CarouselRenderItem } from "react-native-reanimated-carousel";

interface Options {
  rounded?: boolean;
  style?: StyleProp<ImageStyle>;
}

export const renderItem =
    ({ rounded = false, style }: Options = {}): CarouselRenderItem<any> => {
        const Item: CarouselRenderItem<any> = ({ index }) => (
            <SlideItem key={index} index={index} rounded={rounded} style={style} />
        );

        // Manually assign display name for ESLint / DevTools
        (Item as any).displayName = "CarouselItem";

        return Item;
    };
