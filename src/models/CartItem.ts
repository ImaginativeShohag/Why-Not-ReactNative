export interface CartItem {
  id: number;
  userId: number;
  // Example: 2020-03-02T00:00:00.000Z
  date: string;
  products: CartProduct[];
  __v: number;
}

export interface CartProduct {
  productId: number;
  quantity: number;
}

// UI Models

export interface DetailedCartItem {
  id: number;
  userId: number;
  date: string;
  products: DetailedCartProduct[];
}

export interface DetailedCartProduct {
  id: number;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

// Helper: convert date string to JS Date
export function getOrderedAt(cartItem: DetailedCartItem): Date | null {
  if (!cartItem.date) return null;
  return new Date(cartItem.date);
}
