import { Product, ProductDocument } from 'src/products/schemas/product.schema';

export interface OrderItem {
  name: string;
  qty: number;
  image: string;
  price: number;
  productId: Product;
}

export interface PaymentResult {
  id: string;
  status: string;
  update_time: string;
  email_address: string;
  provider?: 'PayPal' | 'Stripe';
}

export interface CartItem {
  productId: string;
  sizeId: string;
  size: string;
  color: string;
  name: string;
  image: string;
  price: number;
  countInStock: number;
  qty: number;
}

export interface PaginatedProducts {
  products: ProductDocument[];
  pages: number;
  page: number;
}
