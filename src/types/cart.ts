export type CartItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
};

export type UserCart = {
  email: string;
  items: CartItem[];
  updatedAt: string;
};

export type CartTotals = {
  positionsCount: number;
  itemsCount: number;
  subtotal: number;
};
