import {
  canEnter,
  initialCheckoutState,
  isLocked,
  resumeStep,
  transition,
  type CheckoutEvent,
  type CheckoutState,
} from "@/src/projects/store/checkout/checkoutMachine";
import {
  checkPromo,
  computeTotals,
  formatAddressLines,
} from "@/src/projects/store/checkout/pricing";
import { validateAddress } from "@/src/projects/store/checkout/validation";
import {
  EMPTY_ADDRESS,
  type Address,
} from "@/src/projects/store/models/Address";

const ADDRESS: Address = {
  ...EMPTY_ADDRESS,
  fullName: "Ada Lovelace",
  line1: "12 Analytical St",
  city: "Austin",
  postalCode: "73301",
  country: "US",
};

const run = (events: CheckoutEvent[], from = initialCheckoutState) =>
  events.reduce<CheckoutState>(transition, from);

const toReview: CheckoutEvent[] = [
  { type: "START", idempotencyKey: "key-1" },
  { type: "SUBMIT_ADDRESS", address: ADDRESS },
  { type: "SELECT_SHIPPING", optionId: "standard" },
  { type: "CONFIRM_SHIPPING" },
  { type: "SELECT_PAYMENT", method: "simulated" },
];

describe("checkout machine", () => {
  it("walks address → shipping → payment → review", () => {
    const state = run(toReview);
    expect(state.step).toBe("review");
    expect(resumeStep(state)).toBe("review");
  });

  it("refuses to skip ahead without the prerequisites", () => {
    const state = run([{ type: "START", idempotencyKey: "k" }]);
    expect(canEnter(state, "shipping")).toBe(false);
    expect(transition(state, { type: "GO_TO", step: "review" })).toBe(state);
    expect(
      transition(state, {
        type: "SUBMIT_ADDRESS",
        address: { ...ADDRESS, postalCode: "" },
      }).step,
    ).toBe("address");
  });

  it("resumes an interrupted checkout with the same idempotency key", () => {
    const halfway = run(toReview.slice(0, 3));
    // Force-quit + relaunch re-sends START with a brand-new key.
    const resumed = transition(halfway, {
      type: "START",
      idempotencyKey: "key-2",
    });
    expect(resumed).toBe(halfway);
    expect(resumed.idempotencyKey).toBe("key-1");
    expect(resumeStep(resumed)).toBe("payment");
  });

  it("locks earlier steps once the order is placed", () => {
    const placed = transition(run(toReview), {
      type: "ORDER_PLACED",
      orderId: "10482",
    });
    expect(isLocked(placed)).toBe(true);
    expect(canEnter(placed, "address")).toBe(false);
    expect(canEnter(placed, "review")).toBe(true);
    expect(
      transition(placed, { type: "APPLY_PROMO", code: "SAVE10" }).promoCode,
    ).toBe(placed.promoCode);
  });

  it("records the order even when step is stale after Edit → back", () => {
    // Review → Edit address → back to the bag leaves `step` at "address";
    // the bag then resumes straight to the review screen.
    const stale = run([{ type: "GO_TO", step: "address" }], run(toReview));
    expect(stale.step).toBe("address");
    const placed = transition(stale, { type: "ORDER_PLACED", orderId: "7" });
    expect(placed.orderId).toBe("7");
    expect(placed.step).toBe("review");

    // So the next checkout gets a new key instead of replaying order 7.
    const done = transition(placed, { type: "COMPLETED" });
    const next = transition(done, { type: "START", idempotencyKey: "key-9" });
    expect(next.idempotencyKey).toBe("key-9");
    expect(next.orderId).toBeNull();
  });

  it("ignores ORDER_PLACED before review is reachable or once placed", () => {
    const early = run(toReview.slice(0, 2));
    expect(transition(early, { type: "ORDER_PLACED", orderId: "1" })).toBe(
      early,
    );
    const placed = transition(run(toReview), {
      type: "ORDER_PLACED",
      orderId: "1",
    });
    expect(
      transition(placed, { type: "ORDER_PLACED", orderId: "2" }).orderId,
    ).toBe("1");
  });

  it("a completed checkout starts fresh but keeps a saved address", () => {
    const done = run(
      [{ type: "ORDER_PLACED", orderId: "1" }, { type: "COMPLETED" }],
      run(toReview),
    );
    const next = transition(done, { type: "START", idempotencyKey: "key-3" });
    expect(next.idempotencyKey).toBe("key-3");
    expect(next.orderId).toBeNull();
    expect(next.address).toEqual(ADDRESS);
  });

  it("unlocks promos after completion and carries a new code into the next START", () => {
    const placed = transition(
      run([{ type: "APPLY_PROMO", code: "SAVE10" }], run(toReview)),
      { type: "ORDER_PLACED", orderId: "1" },
    );
    const done = transition(placed, { type: "COMPLETED" });
    // The last order's code is gone and the bag may apply another.
    expect(isLocked(done)).toBe(false);
    expect(done.promoCode).toBeNull();

    const applied = transition(done, { type: "APPLY_PROMO", code: "freeship" });
    expect(applied.promoCode).toBe("FREESHIP");
    const next = transition(applied, {
      type: "START",
      idempotencyKey: "key-4",
    });
    expect(next.idempotencyKey).toBe("key-4");
    expect(next.promoCode).toBe("FREESHIP");
  });
});

describe("pricing", () => {
  it("applies percent promos before free-shipping threshold and tax", () => {
    // $120 subtotal, SAVE10 → $108; standard ship free over $100; US 8.25%.
    const totals = computeTotals(12000, {
      promoCode: "save10",
      shippingOptionId: "standard",
      country: "US",
    });
    expect(totals.discountCents).toBe(1200);
    expect(totals.shippingCents).toBe(0);
    expect(totals.taxCents).toBe(Math.round(10800 * 0.0825));
    expect(totals.totalCents).toBe(10800 + totals.taxCents);
  });

  it("charges shipping under the threshold and rejects unmet minimums", () => {
    const totals = computeTotals(2000, { shippingOptionId: "standard" });
    expect(totals.shippingCents).toBe(500);
    expect(checkPromo("WELCOME5", 2000).valid).toBe(false);
    expect(checkPromo("nope", 99999).valid).toBe(false);
  });
});

describe("address validation", () => {
  it("accepts a complete address and flags each missing field", () => {
    expect(validateAddress(ADDRESS)).toEqual({});
    const errors = validateAddress(EMPTY_ADDRESS);
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["fullName", "line1", "city", "postalCode"]),
    );
  });
});

describe("formatAddressLines", () => {
  it("includes the region (state) when present", () => {
    expect(
      formatAddressLines({ ...ADDRESS, region: "TX", postalCode: "78701" }),
    ).toEqual(["Ada Lovelace", "12 Analytical St", "Austin, TX 78701, US"]);
  });

  it("omits an empty region and line2", () => {
    expect(formatAddressLines({ ...ADDRESS, line2: "", region: "" })).toEqual([
      "Ada Lovelace",
      "12 Analytical St",
      "Austin 73301, US",
    ]);
  });
});
