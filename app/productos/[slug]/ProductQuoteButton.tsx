"use client";

import { useRouter } from "next/navigation";

const CART_KEY = "merly-catalog-cart-v2";

function readCart(value: string | null) {
  if (!value) return {} as Record<string, number>;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {} as Record<string, number>;
    const cart: Record<string, number> = {};
    for (const [id, quantity] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^[a-zA-Z0-9._-]{1,120}$/.test(id)) continue;
      const normalized = Math.min(999, Math.max(1, Math.trunc(Number(quantity) || 1)));
      cart[id] = normalized;
    }
    return cart;
  } catch {
    return {} as Record<string, number>;
  }
}

export default function ProductQuoteButton({ productId, productLabel }: { productId: string; productLabel: string }) {
  const router = useRouter();

  function addToQuote() {
    const cart = readCart(window.localStorage.getItem(CART_KEY));
    cart[productId] = Math.max(1, cart[productId] ?? 1);
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    router.push(`/catalogo?buscar=${encodeURIComponent(productLabel)}`);
  }

  return <button className="product-primary-action" type="button" onClick={addToQuote}>Agregar a cotización</button>;
}
