import type { Address } from "../models/Address";
import type { OrderTotals } from "../models/Order";
import { type Cents, formatMoney } from "../utils/money";

export type ShippingOption = {
  id: "standard" | "express" | "next_day";
  label: string;
  eta: string;
  priceCents: Cents;
  /** Standard shipping is free above this (post-discount) subtotal. */
  freeOverCents?: Cents;
};

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "standard",
    label: "Standard",
    eta: "5–7 business days",
    priceCents: 500,
    freeOverCents: 10000,
  },
  {
    id: "express",
    label: "Express",
    eta: "1–2 business days",
    priceCents: 1500,
  },
  {
    id: "next_day",
    label: "Next day",
    eta: "Tomorrow by 9 PM",
    priceCents: 2500,
  },
];

export type Promo =
  | { code: string; kind: "percent"; percent: number; minSubtotalCents?: Cents }
  | {
      code: string;
      kind: "fixed";
      amountCents: Cents;
      minSubtotalCents?: Cents;
    }
  | { code: string; kind: "free_shipping"; minSubtotalCents?: Cents };

/**
 * Demo promo table. In production the server validates codes (expiry,
 * per-user limits) and returns the discount — the client only previews it.
 */
export const PROMOS: Record<string, Promo> = {
  SAVE10: { code: "SAVE10", kind: "percent", percent: 10 },
  WELCOME5: {
    code: "WELCOME5",
    kind: "fixed",
    amountCents: 500,
    minSubtotalCents: 2500,
  },
  FREESHIP: { code: "FREESHIP", kind: "free_shipping" },
};

/** Simplified destination tax table (rate applied to goods + shipping). */
export const TAX_RATES: Record<string, number> = {
  US: 0.0825,
  CA: 0.13,
  GB: 0.2,
  DE: 0.19,
  FR: 0.2,
  BD: 0.15,
};

export type PromoCheck =
  { valid: true; promo: Promo } | { valid: false; reason: string };

export function checkPromo(code: string, subtotalCents: Cents): PromoCheck {
  const promo = PROMOS[code.trim().toUpperCase()];
  if (!promo) return { valid: false, reason: "That code isn't valid." };
  if (promo.minSubtotalCents && subtotalCents < promo.minSubtotalCents) {
    return {
      valid: false,
      reason: "Your bag doesn't meet this code's minimum yet.",
    };
  }
  return { valid: true, promo };
}

const discountFor = (promo: Promo | undefined, subtotalCents: Cents): Cents => {
  if (!promo) return 0;
  if (promo.kind === "percent") {
    return Math.round((subtotalCents * promo.percent) / 100);
  }
  if (promo.kind === "fixed") return Math.min(promo.amountCents, subtotalCents);
  return 0;
};

export function computeTotals(
  subtotalCents: Cents,
  options: {
    shippingOptionId?: string | null;
    promoCode?: string | null;
    country?: string | null;
  } = {},
): OrderTotals {
  const check = options.promoCode
    ? checkPromo(options.promoCode, subtotalCents)
    : undefined;
  const promo = check?.valid ? check.promo : undefined;

  const discountCents = discountFor(promo, subtotalCents);
  const discounted = subtotalCents - discountCents;

  const option = SHIPPING_OPTIONS.find(
    (o) => o.id === options.shippingOptionId,
  );
  let shippingCents = option?.priceCents ?? 0;
  if (
    option?.freeOverCents !== undefined &&
    discounted >= option.freeOverCents
  ) {
    shippingCents = 0;
  }
  if (promo?.kind === "free_shipping") shippingCents = 0;

  const rate = options.country ? (TAX_RATES[options.country] ?? 0) : 0;
  const taxCents = Math.round((discounted + shippingCents) * rate);

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents: discounted + shippingCents + taxCents,
  };
}

export type TotalsRow = {
  label: string;
  value: string;
  emphasis?: boolean;
  positive?: boolean;
};

/**
 * The summary rows every totals table shows: subtotal, discount (only when
 * one applies), shipping, tax and the emphasised total. Labels and the money
 * formatter vary per screen.
 */
export function totalsRows(
  totals: OrderTotals,
  {
    discountLabel = "Discount",
    taxLabel = "Tax",
    format = (cents: Cents) => formatMoney(cents),
  }: {
    discountLabel?: string;
    taxLabel?: string;
    format?: (cents: Cents) => string;
  } = {},
): TotalsRow[] {
  return [
    { label: "Subtotal", value: format(totals.subtotalCents) },
    ...(totals.discountCents > 0
      ? [
          {
            label: discountLabel,
            value: `−${format(totals.discountCents)}`,
            positive: true,
          },
        ]
      : []),
    { label: "Shipping", value: format(totals.shippingCents) },
    { label: taxLabel, value: format(totals.taxCents) },
    { label: "Total", value: format(totals.totalCents), emphasis: true },
  ];
}

/** Name, street (line1, line2) and "city postcode, country". */
export const formatAddressLines = (address: Address): string[] => [
  address.fullName,
  [address.line1, address.line2].filter(Boolean).join(", "),
  `${address.city} ${address.postalCode}, ${address.country}`,
];
