import { getLocales } from "expo-localization";

import { storeConfig } from "../constants/config";

/**
 * Money is carried as integer minor units (cents) everywhere math happens —
 * FakeStoreAPI prices are floats, and 0.1 + 0.2 !== 0.3. Convert once at the
 * API boundary, format once at the view boundary.
 */
export type Cents = number;

export const toCents = (amount: number): Cents => Math.round(amount * 100);

export const fromCents = (cents: Cents): number => cents / 100;

const deviceLocale = (): string => {
  try {
    return getLocales()[0]?.languageTag ?? "en-US";
  } catch {
    return "en-US";
  }
};

const formatters = new Map<string, Intl.NumberFormat>();

const formatterFor = (locale: string, currency: string) => {
  const key = `${locale}|${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
    formatters.set(key, formatter);
  }
  return formatter;
};

/**
 * The single price formatter. Never string-concatenate a currency symbol:
 * de-DE puts it after the number with a comma decimal ("12,50 $"), ja-JP has
 * no minor units, and RTL locales reorder the whole thing.
 */
export function formatMoney(
  cents: Cents,
  options: { currency?: string; locale?: string } = {},
): string {
  const currency = options.currency ?? storeConfig.currency;
  const locale = options.locale ?? deviceLocale();
  return formatterFor(locale, currency).format(fromCents(cents));
}

/** Convenience for API floats (e.g. `product.price`). */
export const formatPrice = (
  amount: number,
  options?: { currency?: string; locale?: string },
) => formatMoney(toCents(amount), options);
