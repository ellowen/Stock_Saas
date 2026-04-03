import { useCallback, useState } from "react";
import type { CartEntry } from "../types";

export type UseCartReturn = {
  cart: CartEntry[];
  addToCart: (variantId: number, quantity?: number) => void;
  updateCartQty: (index: number, delta: number) => void;
  updateCartDiscount: (index: number, discount: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
};

export function useCart(): UseCartReturn {
  const [cart, setCart] = useState<CartEntry[]>([]);

  const addToCart = useCallback((variantId: number, quantity = 1) => {
    const qty = Math.max(1, quantity);
    setCart((c) => {
      const i = c.findIndex((x) => x.productVariantId === variantId);
      if (i >= 0) {
        const next = [...c];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
        return next;
      }
      return [...c, { productVariantId: variantId, quantity: qty }];
    });
  }, []);

  const updateCartQty = useCallback((index: number, delta: number) => {
    setCart((c) => {
      const next = [...c];
      const newQty = next[index].quantity + delta;
      if (newQty < 1) return c.filter((_, i) => i !== index);
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
  }, []);

  const updateCartDiscount = useCallback((index: number, discount: number) => {
    setCart((c) => {
      const next = [...c];
      next[index] = { ...next[index], discount: Math.max(0, discount) };
      return next;
    });
  }, []);

  const removeFromCart = useCallback((index: number) => {
    setCart((c) => c.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return { cart, addToCart, updateCartQty, updateCartDiscount, removeFromCart, clearCart };
}
