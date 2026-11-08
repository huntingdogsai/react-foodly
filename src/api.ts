// The Foodly backend client. Same contract as examples/foodly-backend/server.mjs (shared by every
// Foodly demo). The base URL defaults to the local backend; set VITE_FOODLY_API to point elsewhere.
const BASE = (import.meta.env.VITE_FOODLY_API as string | undefined) ?? 'http://localhost:8787';

export interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  category: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  loyaltyTier: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

let accessToken: string | undefined;

function headers(json = false): Record<string, string> {
  const result: Record<string, string> = {};
  if (json) result['content-type'] = 'application/json';
  if (accessToken) result.authorization = `Bearer ${accessToken}`;
  return result;
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? fallback;
}

export async function signIn(email: string, password: string): Promise<{ user: User }> {
  const response = await fetch(`${BASE}/auth/sign-in`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, 'Sign in failed'));
  const data = (await response.json()) as { user: User; accessToken: string };
  accessToken = data.accessToken;
  return { user: data.user };
}

export async function signOut(): Promise<void> {
  await fetch(`${BASE}/auth/sign-out`, { method: 'POST', headers: headers() }).catch(() => undefined);
  accessToken = undefined;
}

export async function searchProducts(query = ''): Promise<Product[]> {
  const response = await fetch(`${BASE}/products/search?q=${encodeURIComponent(query)}`);
  const data = (await response.json()) as { products: Product[] };
  return data.products;
}

export async function addToCart(productId: string, quantity = 1): Promise<{ items: CartItem[]; total: number }> {
  const response = await fetch(`${BASE}/cart/items`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({ productId, quantity }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, 'Could not add to cart'));
  return (await response.json()) as { items: CartItem[]; total: number };
}

export async function validatePromo(code: string, subtotal: number): Promise<{ valid: boolean; discount: number }> {
  const response = await fetch(`${BASE}/promotions/validate`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({ code, subtotal }),
  });
  const data = (await response.json()) as { valid?: boolean; discount?: number };
  return { valid: Boolean(data.valid), discount: data.discount ?? 0 };
}

export interface Order {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
}

export async function placeOrder(
  items: CartItem[],
  draft: Record<string, unknown>,
  discount: number,
): Promise<Order> {
  const response = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({ items, draft, discount }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, 'Order could not be placed'));
  return (await response.json()) as Order;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
