import {
  mockServer,
  nextOrderNumber,
} from "@/src/projects/store/api/mockServer";
import type { PlaceOrderInput } from "@/src/projects/store/models/Order";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("expo-crypto", () => ({
  randomUUID: () => "00000000-0000-0000-0000-000000000000",
}));

const INPUT: PlaceOrderInput = {
  userId: 1,
  lines: [],
  totals: {
    subtotalCents: 0,
    discountCents: 0,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 0,
  },
  currency: "USD",
  shippingOptionId: "standard",
  address: {
    fullName: "Ada",
    line1: "1 St",
    city: "Austin",
    postalCode: "78701",
    country: "US",
  },
};

describe("nextOrderNumber", () => {
  it("starts at 10001 and never reuses a number", () => {
    expect(nextOrderNumber([])).toBe(10001);
    expect(nextOrderNumber([{ id: "10007" }, { id: "10003" }])).toBe(10008);
    // The counter wins even after orders are gone from the list.
    expect(nextOrderNumber([{ id: "10002" }], 10040)).toBe(10041);
  });
});

describe("mockServer orders", () => {
  it("gives every new order a unique id", async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      ids.add((await mockServer.placeOrder(INPUT, `key-${i}`)).id);
    }
    expect(ids.size).toBe(5);
    // Same idempotency key → same order.
    const again = await mockServer.placeOrder(INPUT, "key-0");
    expect(ids.has(again.id)).toBe(true);
  });

  it("cancels an abandoned unpaid order", async () => {
    const order = await mockServer.placeOrder(INPUT, "abandon");
    expect((await mockServer.cancelOrder(order.id)).status).toBe("cancelled");
    expect((await mockServer.getOrder(order.id)).status).toBe("cancelled");
  });
});
