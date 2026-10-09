"use client";

/**
 * Cart store — backend-persisted cart for logged-in users,
 * localStorage cart for guests.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, tokenStore } from "@/lib/api/client";
import { effectivePrice, shopService } from "@/lib/services/shop";
import { useAuth } from "./auth-store";
import type { CartItem, CartLine, Product } from "@/lib/types";

interface CartContextValue {
  items: CartItem[];
  lines: CartLine[];
  count: number;
  subtotal: number;
  loading: boolean;
  addItem: (productId: number, quantity?: number) => Promise<void>;
  setQuantity: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

const GUEST_KEY = "novamart-cart-guest-v1";

function readGuestCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface ApiCartLine {
  product_id: number;
  quantity: number;
  line_total: string | number;
}

interface ApiCart {
  lines: ApiCartLine[];
  count: number;
  subtotal: string | number;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [catalog, setCatalog] = useState<Map<number, Product>>(new Map());
  const [loading, setLoading] = useState(false);

  const loggedIn = !!user && !!tokenStore.getAccess();

  // Load cart: backend for logged-in, localStorage for guests.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (loggedIn) {
          const cart = await api.get<ApiCart>("/api/v1/cart");
          if (alive) {
            setItems(
              cart.lines.map((l) => ({ productId: l.product_id, quantity: l.quantity })),
            );
          }
        } else {
          if (alive) setItems(readGuestCart());
        }
      } catch {
        if (alive && !loggedIn) setItems(readGuestCart());
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loggedIn, user?.id]);

  // Persist guest cart.
  useEffect(() => {
    if (!loggedIn) {
      try {
        window.localStorage.setItem(GUEST_KEY, JSON.stringify(items));
      } catch {
        /* ignore */
      }
    }
  }, [items, loggedIn]);

  // Resolve product details.
  useEffect(() => {
    let alive = true;
    (async () => {
      const map = new Map<number, Product>();
      const ids = [...new Set(items.map((i) => i.productId))];
      for (const id of ids) {
        const p = await shopService.getProductById(id);
        if (p) map.set(id, p);
      }
      if (alive) setCatalog(map);
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  const addItem = useCallback(
    async (productId: number, quantity = 1) => {
      if (loggedIn) {
        const cart = await api.post<ApiCart>("/api/v1/cart/items", {
          product_id: productId,
          quantity,
        });
        setItems(cart.lines.map((l) => ({ productId: l.product_id, quantity: l.quantity })));
      } else {
        setItems((prev) => {
          const found = prev.find((i) => i.productId === productId);
          if (found) {
            return prev.map((i) =>
              i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i,
            );
          }
          return [...prev, { productId, quantity }];
        });
      }
    },
    [loggedIn],
  );

  const setQuantity = useCallback(
    async (productId: number, quantity: number) => {
      if (loggedIn) {
        const cart = await api.patch<ApiCart>(`/api/v1/cart/items/${productId}`, {
          quantity,
        });
        setItems(cart.lines.map((l) => ({ productId: l.product_id, quantity: l.quantity })));
      } else {
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        );
      }
    },
    [loggedIn],
  );

  const removeItem = useCallback(
    async (productId: number) => {
      if (loggedIn) {
        const cart = await api.delete<ApiCart>(`/api/v1/cart/items/${productId}`);
        setItems(cart.lines.map((l) => ({ productId: l.product_id, quantity: l.quantity })));
      } else {
        setItems((prev) => prev.filter((i) => i.productId !== productId));
      }
    },
    [loggedIn],
  );

  const clear = useCallback(async () => {
    if (loggedIn) {
      await api.delete("/api/v1/cart");
      setItems([]);
    } else {
      setItems([]);
    }
  }, [loggedIn]);

  const { lines, count, subtotal } = useMemo(() => {
    const lines: CartLine[] = [];
    for (const item of items) {
      const product = catalog.get(item.productId);
      if (!product) continue;
      const price = effectivePrice(product);
      lines.push({ ...item, product, lineTotal: price * item.quantity });
    }
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    return { lines, count, subtotal };
  }, [items, catalog]);

  const value = useMemo(
    () => ({ items, lines, count, subtotal, loading, addItem, setQuantity, removeItem, clear }),
    [items, lines, count, subtotal, loading, addItem, setQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
