import type { Product } from "@/src/projects/store/models/Product";
import {
  addItem,
  changeQuantity,
  itemCount,
  MAX_QUANTITY_PER_ITEM,
  mergeCarts,
  subtotalCents,
  toServerLines,
  type CartItem,
} from "@/src/projects/store/stores/cartMath";

const product = (id: number, price = 10, title = `P${id}`): Product => ({
  id,
  title,
  price,
  description: "",
  category: "misc",
  image: "",
  rating: { rate: 4, count: 1 },
});

const line = (id: number, quantity: number, price = 10): CartItem => ({
  ...product(id, price),
  quantity,
});

describe("cart math", () => {
  it("adds a new product, then increments the existing line", () => {
    let items = addItem([], product(1));
    items = addItem(items, product(1));
    items = addItem(items, product(2));
    expect(items.map((i) => [i.id, i.quantity])).toEqual([
      [1, 2],
      [2, 1],
    ]);
  });

  it("clamps quantity and drops lines that reach zero", () => {
    let items = [line(1, MAX_QUANTITY_PER_ITEM)];
    items = addItem(items, product(1));
    expect(items[0].quantity).toBe(MAX_QUANTITY_PER_ITEM);
    expect(changeQuantity([line(1, 1), line(2, 3)], 1, -1)).toEqual([
      line(2, 3),
    ]);
  });

  it("sums in integer cents, never floats", () => {
    // 0.1 + 0.2 territory: 3 × $19.99 + 1 × $0.10
    const items = [line(1, 3, 19.99), line(2, 1, 0.1)];
    expect(subtotalCents(items)).toBe(6007);
    expect(itemCount(items)).toBe(4);
  });

  it("round-trips to server lines", () => {
    expect(toServerLines([line(5, 2)])).toEqual([
      { productId: 5, quantity: 2 },
    ]);
  });
});

describe("mergeCarts (sign-in reconciliation rule)", () => {
  const catalogue = new Map([
    [1, product(1, 12, "fresh title")],
    [2, product(2)],
    [3, product(3)],
  ]);
  const resolve = (id: number) => catalogue.get(id);

  it("unions by id and takes the max quantity, not the sum", () => {
    const merged = mergeCarts(
      [line(1, 2), line(2, 1)],
      [
        { productId: 1, quantity: 3 },
        { productId: 3, quantity: 1 },
      ],
      resolve,
    );
    expect(merged.map((i) => [i.id, i.quantity])).toEqual([
      [1, 3],
      [2, 1],
      [3, 1],
    ]);
  });

  it("is idempotent — merging the same cart twice doesn't double it", () => {
    const local = [line(1, 2)];
    const once = mergeCarts(local, [{ productId: 1, quantity: 2 }], resolve);
    const twice = mergeCarts(once, toServerLines(once), resolve);
    expect(twice.map((i) => i.quantity)).toEqual([2]);
  });

  it("prefers the server's product data for shared lines", () => {
    const [merged] = mergeCarts(
      [line(1, 1, 10)],
      [{ productId: 1, quantity: 1 }],
      resolve,
    );
    expect(merged.price).toBe(12);
    expect(merged.title).toBe("fresh title");
  });

  it("drops delisted server lines and clamps quantities", () => {
    const merged = mergeCarts(
      [],
      [
        { productId: 99, quantity: 1 },
        { productId: 2, quantity: 50 },
      ],
      resolve,
    );
    expect(merged.map((i) => [i.id, i.quantity])).toEqual([
      [2, MAX_QUANTITY_PER_ITEM],
    ]);
  });
});
