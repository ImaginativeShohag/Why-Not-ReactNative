export interface UserName {
  firstname: string;
  lastname: string;
}

export interface UserGeoLocation {
  lat: number;
  long: number;
}

export interface UserAddress {
  geolocation: UserGeoLocation;
  city: string;
  street: string;
  number: number;
  zipcode: string;
}

export interface User {
  id: number;
  name: UserName;
  username: string;
  email: string;
  phone: string;
  address?: UserAddress;
}
