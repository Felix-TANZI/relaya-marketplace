import { useEffect, useState } from "react";
import type { CartItem } from "./types";
import { subscribeCart, getCart } from "./cartStore";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(getCart());

  useEffect(() => {
    return subscribeCart(setItems);
  }, []);

  return items;
}
