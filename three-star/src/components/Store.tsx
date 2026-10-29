"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon as Iconify } from "@iconify/react";
import { PRODUCTS, cop } from "@/lib/products";
import { useCart } from "@/context/CartContext";

/* ============ CONFIGURACIÓN ============
   Las fotos van en /public/tienda/ y se buscan solas por el nombre del producto:
     Tote bag, Bitácora y Cofre (2 fotos, carrusel):  tote-1.jpg  tote-2.jpg  |  bitacora-1.jpg  bitacora-2.jpg  |  cofre-1.jpg  cofre-2.jpg
     Los demás (1 foto):  camiseta.jpg  vela.jpg  taza.jpg  pin.jpg  llavero.jpg  osito.jpg
   Si un producto trae su propia lista "photos" en lib/products.ts, se usa esa en vez de estas. */
const FOTO_EXT = "png"; // cambia a "png" o "webp" si tus fotos son de otro tipo

type IconKey = "tote" | "bitacora" | "cofre" | "camiseta" | "vela" | "taza" | "pin" | "llavero" | "osito";

const CARRUSEL: IconKey[] = ["tote", "bitacora", "cofre", "camiseta", "pin", "osito"]; // productos con 2 fotos

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

type Product = (typeof PRODUCTS)[number] & { photos?: string[] };

function iconOf(p: Product): IconKey | null {
  const s = norm(`${p.id} ${p.name}`);
  return MATCH.find(([, words]) => words.some((w) => s.includes(w)))?.[0] ?? null;
}

function photosOf(p: Product): string[] {
  if (p.photos?.length) return p.photos;
  const k = iconOf(p);
  if (!k) return [];
  return CARRUSEL.includes(k)
    ? [`/tienda/${k}-1.${FOTO_EXT}`, `/tienda/${k}-2.${FOTO_EXT}`]
    : [`/tienda/${k}.${FOTO_EXT}`];
}

/* ============ ICONOS (librería Iconify) ============
   Iconify reúne +150 colecciones de iconos. Cada nombre tiene el formato "colección:icono".
   Para cambiar uno: entra a https://icon-sets.iconify.design/ , busca el objeto (ej. "candle"),
   elige el estilo que te guste, y copia el nombre que aparece arriba (ej. "solar:bag-linear"). */
const ICONS: Record<IconKey, string> = {
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

const EMOJI: Record<IconKey, string> = {
  tote: "👜", bitacora: "📓", cofre: "🧰", camiseta: "👕", vela: "🕯️",
  taza: "☕", pin: "🏅", llavero: "🔑", osito: "🧸",
};

function ProductIcon({ k, className = "" }: { k: IconKey; className?: string }) {
  return (
    <Iconify
      icon={ICONS[k]}
      className={className}
      aria-hidden
      fallback={<span className="text-4xl">{EMOJI[k]}</span>}
    />
  );
}

/* ============ FOTOS / CARRUSEL ============ */
function Gallery({ product }: { product: Product }) {
  const photos = photosOf(product);
  const k = iconOf(product);
  const [slide, setSlide] = useState(0);
  const [bad, setBad] = useState<Record<string, boolean>>({}); // fotos que aún no existen
  const n = photos.length;
  const allBad = n === 0 || photos.every((src) => bad[src]);
  const move = (d: number) => setSlide((s) => (s + d + n) % n);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-deep">
      {/* Si todavía no hay foto, se muestra el icono (o el emoji) como marcador */}
      {allBad && (
        <div className="flex h-full w-full items-center justify-center text-white/80">
          {k ? <ProductIcon k={k} className="h-1/2 w-1/2" /> : <span className="text-8xl">{product.image}</span>}
        </div>
      )}

      {photos.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={`${product.name} ${n > 1 ? i + 1 : ""}`.trim()}
          onError={() => setBad((b) => ({ ...b, [src]: true }))}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            i === slide && !allBad ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Flechas y puntos: solo cuando hay más de una foto */}
      {n > 1 && (
        <>
          <button aria-label="Foto anterior" onClick={() => move(-1)}
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65">
            <Iconify icon="lucide:chevron-left" width={22} height={22} />
          </button>
          <button aria-label="Foto siguiente" onClick={() => move(1)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65">
            <Iconify icon="lucide:chevron-right" width={22} height={22} />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
            {photos.map((src, i) => (
              <button key={src} aria-label={`Ver foto ${i + 1}`} onClick={() => setSlide(i)}
                className={`h-2.5 w-2.5 rounded-full transition ${i === slide ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ============ TIENDA ============ */
export default function Store() {
  const [sel, setSel] = useState<Product>(PRODUCTS[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  const router = useRouter();

  const pick = (p: Product) => { setSel(p); setQty(1); setAdded(false); };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-2">
      {/* Cuadrícula de iconos */}
      <div className="grid grid-cols-3 gap-4 rounded-2xl bg-card p-4">
        {PRODUCTS.map((p) => {
          const k = iconOf(p);
          return (
            <button key={p.id} onClick={() => pick(p)} aria-label={p.name} title={p.name}
              className={`flex aspect-square items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-black transition hover:scale-105 hover:bg-white/30 ${
                sel.id === p.id ? "ring-2 ring-star" : ""
              }`}>
              {k ? <ProductIcon k={k} className="h-[58%] w-[58%]" /> : <span className="text-4xl">{p.image}</span>}
            </button>
          );
        })}
      </div>

      {/* Detalle: fotos + datos */}
      <aside className="flex flex-col items-center gap-4 rounded-2xl bg-card p-6 text-white">
        <Gallery key={sel.id} product={sel} />
        <h2 className="text-2xl font-black">{sel.name}</h2>
        <p className="text-sm opacity-80">{sel.category} · {sel.stock} disponibles</p>
        <p className="text-3xl font-black text-star">{cop(sel.price)}</p>
        <div className="flex items-center gap-4">
          <button aria-label="Quitar uno" onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-deep">
            <Iconify icon="lucide:minus" width={20} height={20} />
          </button>
          <span className="w-6 text-center text-xl font-bold">{qty}</span>
          <button aria-label="Agregar uno" onClick={() => setQty(Math.min(sel.stock, qty + 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-deep">
            <Iconify icon="lucide:plus" width={20} height={20} />
          </button>
        </div>
        <div className="flex w-full gap-3">
          <button onClick={() => { add(sel.id, qty); setAdded(true); }} className="flex-1 rounded-lg bg-star py-3 font-bold text-black hover:brightness-110">
            {added ? "✓ Añadido" : "Añadir"}
          </button>
          <button onClick={() => { add(sel.id, qty); router.push("/checkout"); }} className="flex-1 rounded-lg bg-lime py-3 font-bold text-black hover:brightness-110">Comprar</button>
        </div>
      </aside>
    </div>
  );
}