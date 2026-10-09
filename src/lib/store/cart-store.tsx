"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { shopService, effectivePrice } from "@/lib/services/shop";
import { useStoreVersion } from "@/lib/data/store";
import type { CartItem, CartLine, Product } from "@/lib/types";

interface CartContextValue {
  items: CartItem[];
  lines: CartLine[];
  count: number;
  subtotal: number;
  addItem: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "novamart-cart-v1";

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

function readStored(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [catalog, setCatalog] = useState<Map<string, Product>>(new Map());
  const version = useStoreVersion();

  useEffect(() => {
    // Hydrate from localStorage after mount to avoid SSR hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStored());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  // Resolve product details async — refetch khi store đổi (Admin sửa giá/tên).
  useEffect(() => {
    let alive = true;
    (async () => {
      const map = new Map<string, Product>();
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
  }, [items, version]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.productId === productId);
      if (found) {
        return prev.map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { productId, quantity }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) =>
            i.productId === productId ? { ...i, quantity } : i,
          ),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

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
    () => ({ items, lines, count, subtotal, addItem, setQuantity, removeItem, clear }),
    [items, lines, count, subtotal, addItem, setQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
