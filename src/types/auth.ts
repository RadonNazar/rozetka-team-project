import type { NovaPoshtaDeliveryDetails } from './delivery';

export type AuthSession = {
  email: string;
  loggedInAt: string;
};

export type RegisteredUser = {
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  email: string;
  fullName: string;
  phone: string;
  city: string;
  updatedAt: string;
  novaPoshta?: NovaPoshtaDeliveryDetails;
};

export type AuthActionResult = {
  ok: boolean;
  message?: string;
};
