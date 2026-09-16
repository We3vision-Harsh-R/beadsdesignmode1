import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'bd_cart_designs';

function readCart() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

// Digital designs: each design is in the cart at most once
export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(() => {
    const has = (id) => items.some((i) => i._id === id);
    const add = (d) =>
      setItems((prev) =>
        prev.some((i) => i._id === d._id)
          ? prev
          : [...prev, { _id: d._id, code: d.code, name: d.name, price: d.price, image: d.images?.[0] || '', formats: d.formats }]
      );
    const remove = (id) => setItems((prev) => prev.filter((i) => i._id !== id));
    const clear = () => setItems([]);
    const total = items.reduce((s, i) => s + i.price, 0);
    return { items, has, add, remove, clear, count: items.length, total };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
