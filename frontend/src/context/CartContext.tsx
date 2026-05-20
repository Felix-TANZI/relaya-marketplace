// frontend/src/context/CartContext.tsx
// Contexte pour la gestion du panier d'achat

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { cartApi } from "@/services/api/cart";
import { useAuth } from "@/context/AuthContext";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  isDemo?: boolean;
  color?: string;
  storage?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function normalizeCartItems(items: CartItem[]) {
  return items.map((item) => ({
    ...item,
    image: item.image ?? undefined,
    color: item.color ?? undefined,
    storage: item.storage ?? undefined,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const hydratedRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    hydratedRef.current = false;
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    let cancelled = false;
    cartApi
      .get()
      .then((cart) => {
        if (!cancelled) setItems(normalizeCartItems((cart.items ?? []) as CartItem[]));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) hydratedRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hydratedRef.current) return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);

    syncTimerRef.current = window.setTimeout(() => {
      cartApi.save(items).catch(() => {
        // Le panier reste en mémoire; la prochaine modification retentera la synchronisation.
      });
    }, 250);

    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [items, isAuthenticated]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
    if (isAuthenticated) {
      cartApi.clear().catch(() => {});
    }
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
