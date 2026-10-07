import {
  formatMoney,
  formatPrice,
  toCents,
} from "@/src/projects/store/utils/money";

// Intl output uses narrow/non-breaking spaces in some locales; normalise them
// so assertions read naturally.
const normalise = (s: string) => s.replace(/[  ]/g, " ");

describe("money", () => {
  it("converts floats to integer cents without drift", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(109.95)).toBe(10995);
    expect(toCents(22.3)).toBe(2230);
  });

  it("formats en-US with a leading symbol and dot decimals", () => {
    expect(formatMoney(12950, { locale: "en-US", currency: "USD" })).toBe(
      "$129.50",
    );
  });

  it("formats de-DE with a trailing symbol and comma decimals", () => {
    expect(
      normalise(formatMoney(12950, { locale: "de-DE", currency: "EUR" })),
    ).toBe("129,50 €");
  });

  it("formats currencies without minor units", () => {
    expect(formatMoney(150000, { locale: "ja-JP", currency: "JPY" })).toMatch(
      /1,500/,
    );
  });

  it("formats API floats through the same path", () => {
    expect(formatPrice(9.99, { locale: "en-US", currency: "USD" })).toBe(
      "$9.99",
    );
  });
});
