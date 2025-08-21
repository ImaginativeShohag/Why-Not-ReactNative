import {ScrollView, StyleSheet, Text, View, Image, ImageStyle, StyleProp, Dimensions} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {FlashList} from "@shopify/flash-list";

import {Product, Category} from '@/models/Product';
import Carousel, {CarouselRenderItem} from "react-native-reanimated-carousel";
import {SlideItem} from "@/components/SlideItem";
import {renderItem} from "@/utils/render-item";
import {ThemedText} from "@/components/ThemedText";

export const products = [
    new Product({
        id: 1,
        title: 'Wireless Headphones',
        price: 79.99,
        description: 'Bluetooth over-ear headphones with noise isolation and 30h battery.',
        category: Category.ELECTRONICS,
        image: 'https://example.com/images/headphones.jpg',
        ratingRate: 4.4,
        ratingCount: 2381,
    }),
    new Product({
        id: 2,
        title: 'Stainless Steel Watch',
        price: 129.0,
        description: 'Water-resistant analog watch with sapphire crystal.',
        category: Category.JEWELERY,
        image: 'https://example.com/images/watch.jpg',
        ratingRate: 4.6,
        ratingCount: 842,
    }),
    new Product({
        id: 3,
        title: "Men's Slim-Fit Jeans",
        price: 45.5,
        description: 'Comfort stretch denim with a modern slim cut.',
        category: Category.MENS_CLOTHING,
        image: 'https://example.com/images/mens-jeans.jpg',
        ratingRate: 4.3,
        ratingCount: 1560,
    }),
    new Product({
        id: 4,
        title: "Women's Cotton T-Shirt",
        price: 19.99,
        description: 'Soft, breathable cotton tee with a relaxed fit.',
        category: Category.WOMENS_CLOTHING,
        image: 'https://example.com/images/womens-tee.jpg',
        ratingRate: 4.2,
        ratingCount: 980,
    }),
    new Product({
        id: 5,
        title: '4K Action Camera',
        price: 199.99,
        description: 'Waterproof action cam with EIS and dual-screen design.',
        category: Category.ELECTRONICS,
        image: 'https://example.com/images/action-cam.jpg',
        ratingRate: 4.1,
        ratingCount: 412,
    }),
    new Product({
        id: 6,
        title: 'Silver Hoop Earrings',
        price: 34.99,
        description: 'Hypoallergenic sterling silver hoops, 20mm diameter.',
        category: Category.JEWELERY,
        image: 'https://example.com/images/earrings.jpg',
        ratingRate: 4.7,
        ratingCount: 267,
    }),
    new Product({
        id: 7,
        title: "Men's Athletic Hoodie",
        price: 59.0,
        description: 'Moisture-wicking fleece hoodie with zip pockets.',
        category: Category.MENS_CLOTHING,
        image: 'https://example.com/images/mens-hoodie.jpg',
        ratingRate: 4.5,
        ratingCount: 1304,
    }),
    new Product({
        id: 8,
        title: "Women's Yoga Leggings",
        price: 39.99,
        description: 'High-waisted leggings with 4-way stretch and pockets.',
        category: Category.WOMENS_CLOTHING,
        image: 'https://example.com/images/womens-leggings.jpg',
        ratingRate: 4.6,
        ratingCount: 2150,
    }),
    new Product({
        id: 9,
        title: 'USB-C GaN Charger 65W',
        price: 49.95,
        description: 'Compact fast charger with dual USB-C ports and PPS.',
        category: Category.ELECTRONICS,
        image: 'https://example.com/images/gan-charger.jpg',
        ratingRate: 4.8,
        ratingCount: 674,
    }),
    new Product({
        id: 10,
        title: 'Leather Bracelet',
        price: 24.5,
        description: 'Braided genuine leather bracelet with stainless clasp.',
        category: Category.JEWELERY,
        image: 'https://example.com/images/leather-bracelet.jpg',
        ratingRate: 4.0,
        ratingCount: 193,
    }),
];

const defaultDataWith6Colors = [
    "#B0604D",
    "#899F9C",
    "#B3C680",
    "#5C6265",
    "#F5D399",
    "#F1F1F1",
];

const width = Dimensions.get("window").width;

export default function HomeScreen() {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.titleText}>
                    Welcome, Lorem Ipsum build!
                </Text>

                <View style={{flex: 1}}/>

                <Ionicons name="person-circle-outline" size={32}/>
            </View>

            {/* Carousel */}
            <View
                style={{flex: 1}}
            >
                <Carousel
                    loop={true}
                    width={width - 16 * 2}
                    height={300}
                    snapEnabled={true}
                    pagingEnabled={true}
                    autoPlayInterval={2000}
                    data={defaultDataWith6Colors}
                    style={{width: "100%"}}
                    onSnapToItem={(index) => console.log("current index:", index)}
                    mode="parallax"
                    modeConfig={{
                        parallaxScrollingScale: 0.9,
                        parallaxScrollingOffset: 50,
                    }}
                    renderItem={renderItem({rounded: true, style: {marginHorizontal: 0}})}
                />
            </View>

            {/* Product list */}
            <FlashList
                data={products}
                keyExtractor={(item) => String(item.id)}
                renderItem={({item}) => (
                    <View style={{flexDirection: 'row', padding: 12}}>
                        <Image source={{uri: item.image}} style={{width: 64, height: 64, marginRight: 12}}/>
                        <View style={{flex: 1}}>
                            <ThemedText style={{fontWeight: 'bold'}}>{item.title}</ThemedText>
                            <ThemedText>${item.price.toFixed(2)} • {item.category}</ThemedText>
                            <ThemedText>⭐ {item.ratingRate} ({item.ratingCount})</ThemedText>
                        </View>
                    </View>
                )}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    titleText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16
    }
});