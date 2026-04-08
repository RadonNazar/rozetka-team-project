import AsyncStorage from '@react-native-async-storage/async-storage';

import { calculateCartTotals } from './cart-storage';
import type { CartItem } from '../types/cart';
import type { CreateOrderPayload, PaymentMethod, UserOrder } from '../types/order';

const ORDERS_STORAGE_KEY = 'rozetka-team-project:orders';

function isValidCartItem(value: Partial<CartItem>): value is CartItem {
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.price === 'number' &&
    Number.isFinite(value.price) &&
    typeof value.quantity === 'number' &&
    Number.isFinite(value.quantity)
  );
}

function isValidPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'card' || value === 'cash' || value === 'installments';
}

function isValidOrder(value: Partial<UserOrder>): value is UserOrder {
  return (
    typeof value.id === 'string' &&
    typeof value.orderNumber === 'string' &&
    typeof value.email === 'string' &&
    Array.isArray(value.items) &&
    value.items.every((item) => isValidCartItem(item)) &&
    value.totals !== null &&
    typeof value.totals === 'object' &&
    typeof value.totals.positionsCount === 'number' &&
    typeof value.totals.itemsCount === 'number' &&
    typeof value.totals.subtotal === 'number' &&
    typeof value.recipientFullName === 'string' &&
    typeof value.recipientPhone === 'string' &&
    typeof value.recipientCity === 'string' &&
    isValidPaymentMethod(value.paymentMethod) &&
    typeof value.comment === 'string' &&
    value.status === 'placed' &&
    typeof value.createdAt === 'string'
  );
}

async function loadOrders() {
  try {
    const rawValue = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);

    if (!rawValue) {
      return [] as UserOrder[];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      await AsyncStorage.removeItem(ORDERS_STORAGE_KEY);
      return [] as UserOrder[];
    }

    const orders = parsedValue.filter((item): item is UserOrder => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      return isValidOrder(item as Partial<UserOrder>);
    });

    if (orders.length !== parsedValue.length) {
      await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    }

    return orders;
  } catch {
    await AsyncStorage.removeItem(ORDERS_STORAGE_KEY);
    return [] as UserOrder[];
  }
}

async function saveOrders(orders: UserOrder[]) {
  await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function buildOrderNumber(timestamp: string) {
  const compactDate = timestamp.slice(2, 10).replace(/-/g, '');
  const compactTime = timestamp.slice(11, 19).replace(/:/g, '');

  return `RZ-${compactDate}-${compactTime}`;
}

export async function loadUserOrders(email: string) {
  const orders = await loadOrders();
  const normalizedEmail = email.trim().toLowerCase();

  return orders.filter((order) => order.email.trim().toLowerCase() === normalizedEmail);
}

export async function createUserOrder(email: string, payload: CreateOrderPayload) {
  const normalizedEmail = email.trim().toLowerCase();
  const timestamp = new Date().toISOString();
  const nextOrder: UserOrder = {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    orderNumber: buildOrderNumber(timestamp),
    email: normalizedEmail,
    items: payload.items.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      quantity: item.quantity,
    })),
    totals: calculateCartTotals(payload.items),
    recipientFullName: payload.recipientFullName.trim(),
    recipientPhone: payload.recipientPhone.trim(),
    recipientCity: payload.recipientCity.trim(),
    paymentMethod: payload.paymentMethod,
    comment: payload.comment.trim(),
    status: 'placed',
    createdAt: timestamp,
  };

  const orders = await loadOrders();
  await saveOrders([nextOrder, ...orders]);

  return nextOrder;
}
