export enum Category {
    ELECTRONICS = 'electronics',
    JEWELERY = 'jewelery',
    MENS_CLOTHING = "men's clothing",
    WOMENS_CLOTHING = "women's clothing",
}

export interface ProductInit {
    id: number;
    title: string;
    price: number;
    description: string;
    category: Category; // or use a string union if you prefer
    image: string;
    ratingRate: number;
    ratingCount: number;
    quantity?: number; // default 0
}

export class Product {
    readonly id: number;
    readonly title: string;
    readonly price: number;
    readonly description: string;
    readonly category: Category;
    readonly image: string;
    readonly ratingRate: number;
    readonly ratingCount: number;
    quantity: number; // mutable like the Swift `var`

    constructor({
                    id,
                    title,
                    price,
                    description,
                    category,
                    image,
                    ratingRate,
                    ratingCount,
                    quantity = 0,
                }: ProductInit) {
        this.id = id;
        this.title = title;
        this.price = price;
        this.description = description;
        this.category = category;
        this.image = image;
        this.ratingRate = ratingRate;
        this.ratingCount = ratingCount;
        this.quantity = quantity;
    }

    static fromPlain(obj: ProductInit): Product {
        return new Product(obj);
    }

    withQuantity(qty: number): Product {
        return new Product({ ...this, quantity: qty });
    }
}