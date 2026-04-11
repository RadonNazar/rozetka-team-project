export type ProductCategory =
  | 'smartphones'
  | 'laptops'
  | 'audio'
  | 'gaming'
  | 'home'
  | 'accessories';

export type ProductItem = {
  id: string;
  title: string;
  subtitle: string;
  category: ProductCategory;
  brand: string;
  price: number;
  previousPrice?: number;
  badge?: string;
  rating: number;
  reviewsCount: number;
};

export type ProductPriceFilter =
  | 'all'
  | 'under-10000'
  | '10000-30000'
  | '30000-plus'
  | 'discount-only';
