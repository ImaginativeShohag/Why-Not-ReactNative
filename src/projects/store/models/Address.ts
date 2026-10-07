export interface Address {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  phone?: string;
  email?: string;
}

export type AddressField = keyof Address;
export type AddressErrors = Partial<Record<AddressField, string>>;

export const EMPTY_ADDRESS: Address = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "US",
  phone: "",
  email: "",
};
