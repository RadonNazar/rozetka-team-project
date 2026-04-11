import type { CartItem, CartTotals } from './cart';
import type { NovaPoshtaDeliveryDetails } from './delivery';

export type PaymentMethod = 'card' | 'cash' | 'installments';

export type OrderStatus = 'placed';

export type CreateOrderPayload = {
  items: CartItem[];
  recipientFullName: string;
  recipientPhone: string;
  recipientCity: string;
  deliveryDetails: NovaPoshtaDeliveryDetails;
  paymentMethod: PaymentMethod;
  comment: string;
};

export type UserOrder = {
  id: string;
  orderNumber: string;
  email: string;
  items: CartItem[];
  totals: CartTotals;
  recipientFullName: string;
  recipientPhone: string;
  recipientCity: string;
  deliveryDetails: NovaPoshtaDeliveryDetails;
  paymentMethod: PaymentMethod;
  comment: string;
  status: OrderStatus;
  createdAt: string;
};
