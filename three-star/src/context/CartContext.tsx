"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { PRODUCTS } from "@/lib/products";

type Line = { id: string; quantity: number };
type Ctx = { lines: Line[]; add: (id: string, q: number) => void; remove: (id: string) => void; clear: () => void; count: number; ready: boolean };
const CartCtx = createContext<Ctx>(null as unknown as Ctx);
export const useCart = () => useContext(CartCtx);

const KEY = "threestar-cart-v1";

/* Lee y limpia lo guardado: descarta productos que ya no existen y ajusta cantidades al stock */
function parse(raw: string | null): Line[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const out: Line[] = [];
    for (const l of data) {
      const p = PRODUCTS.find((x) => x.id === l?.id);
      const q = Number(l?.quantity);
      if (!p || !Number.isInteger(q) || q < 1) continue;
      if (!out.some((o) => o.id === p.id)) out.push({ id: p.id, quantity: Math.min(q, p.stock) });
    }
    return out;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [ready, setReady] = useState(false); // false hasta leer el carrito guardado (evita parpadeos y no pisa lo guardado)

  // 1) Al abrir la página: recupera el carrito guardado
  useEffect(() => {
    setLines(parse(localStorage.getItem(KEY)));
    setReady(true);
  }, []);

  // 2) Cada cambio se guarda en el navegador
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* modo privado o sin espacio: el carrito sigue funcionando en memoria */ }
  }, [lines, ready]);

  // 3) Si hay otra pestaña abierta, se mantienen sincronizadas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setLines(parse(e.newValue)); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = (id: string, q: number) =>
    setLines((l) => (l.find((x) => x.id === id) ? l.map((x) => (x.id === id ? { ...x, quantity: x.quantity + q } : x)) : [...l, { id, quantity: q }]));
  const remove = (id: string) => setLines((l) => l.filter((x) => x.id !== id));
  const clear = () => setLines([]);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return <CartCtx.Provider value={{ lines, add, remove, clear, count, ready }}>{children}</CartCtx.Provider>;
}