"use client";
import { Icon as Iconify } from "@iconify/react";

/* Iconos de producto COMPARTIDOS: los usan la tienda, el resumen de compra y la pantalla de pago,
   así un producto se ve igual en todos lados. Para cambiar uno, edita ICONS (formato "colección:icono",
   búscalos en https://icon-sets.iconify.design/ ). */
export type IconKey = "tote" | "bitacora" | "cofre" | "camiseta" | "vela" | "taza" | "pin" | "llavero" | "osito";

export const ICONS: Record<IconKey, string> = {
  tote: "bi:bag",
  bitacora: "ep:notebook",
  cofre: "proicons:treasure-chest",
  camiseta: "ph:t-shirt-light",
  vela: "energy-icons:candle-48",
  taza: "bi:cup",
  pin: "cil:badge",
  llavero: "iconoven:key-chain-sharp",
  osito: "arcticons:emoji-teddy-bear",
};

// Solo se usa mientras el icono carga o si no hay internet
const EMOJI: Record<IconKey, string> = {
  tote: "👜", bitacora: "📓", cofre: "🧰", camiseta: "👕", vela: "🕯️",
  taza: "☕", pin: "🏅", llavero: "🔑", osito: "🧸",
};

// Palabras del nombre (o del id) del producto que lo vinculan con cada icono
const MATCH: [IconKey, string[]][] = [
  ["tote", ["tote", "bolsa"]],
  ["bitacora", ["bitacora", "libreta", "cuaderno"]],
  ["cofre", ["cofre"]],
  ["camiseta", ["camiseta", "camisa", "shirt"]],
  ["vela", ["vela"]],
  ["taza", ["taza", "tazon", "mug", "pocillo", "cup", "vaso"]],
  ["pin", ["pin", "insignia", "medalla", "boton"]],
  ["llavero", ["llavero"]],
  ["osito", ["osito", "peluche", "oso"]],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function iconOf(p: { id: string; name: string }): IconKey | null {
  const s = norm(`${p.id} ${p.name}`);
  return MATCH.find(([, words]) => words.some((w) => s.includes(w)))?.[0] ?? null;
}

export function ProductIcon({ k, className = "", emojiClass = "text-4xl" }: { k: IconKey; className?: string; emojiClass?: string }) {
  return <Iconify icon={ICONS[k]} className={className} aria-hidden fallback={<span className={emojiClass}>{EMOJI[k]}</span>} />;
}

/* Icono pequeño de un producto (para listas). Si el producto no tiene icono, usa su emoji de products.ts. */
export function ProductGlyph({ product, className = "h-6 w-6 shrink-0" }: { product: { id: string; name: string; image?: string }; className?: string }) {
  const k = iconOf(product);
  return k ? <ProductIcon k={k} className={className} emojiClass="text-xl" /> : <span aria-hidden className="text-xl">{product.image}</span>;
}