export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: Category;
  image: string;
  rating: Rating;
}

export interface Rating {
  rate: number;
  count: number;
}

export type Category = string;

export interface ProductFilters {
  category?: Category;
}

export interface ProductPage {
  items: Product[];
  nextPage: number | undefined;
}
