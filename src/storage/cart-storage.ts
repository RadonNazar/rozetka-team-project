import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CartItem, CartTotals, UserCart } from '../types/cart';

const CARTS_STORAGE_KEY = 'rozetka-team-project:carts';

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

function isValidStoredCart(value: Partial<UserCart>): value is UserCart {
  return (
    typeof value.email === 'string' &&
    Array.isArray(value.items) &&
    value.items.every((item) => isValidCartItem(item)) &&
    typeof value.updatedAt === 'string'
  );
}

function buildEmptyCart(email: string): UserCart {
  return {
    email: email.trim().toLowerCase(),
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

async function loadCarts() {
  try {
    const rawValue = await AsyncStorage.getItem(CARTS_STORAGE_KEY);

    if (!rawValue) {
      return [] as UserCart[];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      await AsyncStorage.removeItem(CARTS_STORAGE_KEY);
      return [] as UserCart[];
    }

    const carts = parsedValue.filter((item): item is UserCart => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      return isValidStoredCart(item as Partial<UserCart>);
    });

    if (carts.length !== parsedValue.length) {
      await AsyncStorage.setItem(CARTS_STORAGE_KEY, JSON.stringify(carts));
    }

    return carts;
  } catch {
    await AsyncStorage.removeItem(CARTS_STORAGE_KEY);
    return [] as UserCart[];
  }
}

export async function loadUserCart(email: string) {
  const carts = await loadCarts();
  const normalizedEmail = email.trim().toLowerCase();

  return carts.find((cart) => cart.email.trim().toLowerCase() === normalizedEmail) ?? null;
}

export async function saveUserCart(cart: UserCart) {
  const carts = await loadCarts();
  const normalizedEmail = cart.email.trim().toLowerCase();
  const nextCart = {
    ...cart,
    email: normalizedEmail,
  };
  const cartIndex = carts.findIndex((item) => item.email.trim().toLowerCase() === normalizedEmail);

  if (cartIndex === -1) {
    await AsyncStorage.setItem(CARTS_STORAGE_KEY, JSON.stringify([...carts, nextCart]));
    return nextCart;
  }

  const updatedCarts = [...carts];
  updatedCarts[cartIndex] = nextCart;
  await AsyncStorage.setItem(CARTS_STORAGE_KEY, JSON.stringify(updatedCarts));
  return nextCart;
}

export async function ensureUserCart(email: string) {
  const storedCart = await loadUserCart(email);

  if (storedCart) {
    return storedCart;
  }

  const emptyCart = buildEmptyCart(email);
  return saveUserCart(emptyCart);
}

export async function addItemToUserCart(
  email: string,
  item: Pick<CartItem, 'id' | 'title' | 'price'>
) {
  const currentCart = await ensureUserCart(email);
  const itemIndex = currentCart.items.findIndex((cartItem) => cartItem.id === item.id);

  if (itemIndex === -1) {
    return saveUserCart({
      ...currentCart,
      items: [
        ...currentCart.items,
        {
          ...item,
          quantity: 1,
        },
      ],
      updatedAt: new Date().toISOString(),
    });
  }

  const nextItems = [...currentCart.items];
  const nextQuantity = nextItems[itemIndex].quantity + 1;

  nextItems[itemIndex] = {
    ...nextItems[itemIndex],
    quantity: nextQuantity,
  };

  return saveUserCart({
    ...currentCart,
    items: nextItems,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateUserCartItemQuantity(
  email: string,
  itemId: string,
  nextQuantity: number
) {
  const currentCart = await ensureUserCart(email);
  const itemIndex = currentCart.items.findIndex((cartItem) => cartItem.id === itemId);

  if (itemIndex === -1) {
    return currentCart;
  }

  const safeQuantity = Math.max(1, nextQuantity);
  const nextItems = [...currentCart.items];

  nextItems[itemIndex] = {
    ...nextItems[itemIndex],
    quantity: safeQuantity,
  };

  return saveUserCart({
    ...currentCart,
    items: nextItems,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeItemFromUserCart(email: string, itemId: string) {
  const currentCart = await ensureUserCart(email);
  const nextItems = currentCart.items.filter((cartItem) => cartItem.id !== itemId);

  if (nextItems.length === currentCart.items.length) {
    return currentCart;
  }

  return saveUserCart({
    ...currentCart,
    items: nextItems,
    updatedAt: new Date().toISOString(),
  });
}

export async function clearUserCart(email: string) {
  const currentCart = await ensureUserCart(email);

  return saveUserCart({
    ...currentCart,
    items: [],
    updatedAt: new Date().toISOString(),
  });
}

export async function mergeItemsIntoUserCart(email: string, items: CartItem[]) {
  const currentCart = await ensureUserCart(email);
  const nextItems = [...currentCart.items];

  items.forEach((item) => {
    const existingIndex = nextItems.findIndex((cartItem) => cartItem.id === item.id);

    if (existingIndex === -1) {
      nextItems.push({
        id: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
      });
      return;
    }

    nextItems[existingIndex] = {
      ...nextItems[existingIndex],
      quantity: nextItems[existingIndex].quantity + item.quantity,
    };
  });

  return saveUserCart({
    ...currentCart,
    items: nextItems,
    updatedAt: new Date().toISOString(),
  });
}

export function calculateCartTotals(items: CartItem[]): CartTotals {
  return items.reduce<CartTotals>(
    (totals, item) => ({
      positionsCount: totals.positionsCount + 1,
      itemsCount: totals.itemsCount + item.quantity,
      subtotal: totals.subtotal + item.price * item.quantity,
    }),
    {
      positionsCount: 0,
      itemsCount: 0,
      subtotal: 0,
    }
  );
}
