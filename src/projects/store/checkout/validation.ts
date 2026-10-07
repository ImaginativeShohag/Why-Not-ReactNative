import type { Address, AddressErrors } from "../models/Address";

const POSTAL_PATTERNS: Record<string, RegExp> = {
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  BD: /^\d{4}$/,
};

export const SUPPORTED_COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "BD", name: "Bangladesh" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string) => EMAIL.test(email.trim());

/** Per-step validation for the address step. Empty object = valid. */
export function validateAddress(address: Address): AddressErrors {
  const errors: AddressErrors = {};
  if (address.fullName.trim().length < 2) errors.fullName = "Required";
  if (address.line1.trim().length < 3) errors.line1 = "Required";
  if (address.city.trim().length < 2) errors.city = "Required";
  if (!SUPPORTED_COUNTRIES.some((c) => c.code === address.country)) {
    errors.country = "We don't ship there yet";
  }
  const postal = address.postalCode.trim();
  if (!postal) {
    errors.postalCode = "Required";
  } else {
    const pattern = POSTAL_PATTERNS[address.country];
    if (pattern && !pattern.test(postal))
      errors.postalCode = "Check the format";
  }
  if (address.email && !isValidEmail(address.email)) {
    errors.email = "Enter a valid email";
  }
  if (address.phone && address.phone.replace(/\D/g, "").length < 7) {
    errors.phone = "Enter a valid phone number";
  }
  return errors;
}

export const isValidAddress = (address: Address | null | undefined) =>
  !!address && Object.keys(validateAddress(address)).length === 0;

export function validateCredentials(input: {
  username: string;
  password: string;
}) {
  const errors: { username?: string; password?: string } = {};
  if (input.username.trim().length < 3)
    errors.username = "Enter your username or email";
  if (input.password.length < 4) errors.password = "Enter your password";
  return errors;
}

export function validateSignUp(input: {
  email: string;
  username: string;
  password: string;
}) {
  const errors: { email?: string; username?: string; password?: string } = {};
  if (!isValidEmail(input.email)) errors.email = "Enter a valid email";
  if (input.username.trim().length < 3)
    errors.username = "At least 3 characters";
  if (input.password.length < 8) errors.password = "At least 8 characters";
  return errors;
}
