"use client";
import { useState } from "react";
import Link from "next/link";
import { cop } from "@/lib/products";
import { useCart } from "@/context/CartContext";

type Line = { name: string; quantity: number; subtotal: number };
type Result = { paymentId: string; brand: string; last4: string };

// Tarjetas de prueba (solo para la demo)
const TEST_CARDS = [
  { label: "Aprobada", number: "4242424242424242" },
  { label: "Rechazada", number: "4000000000000002" },
  { label: "Sin fondos", number: "4000000000009995" },
];

const brandOf = (n: string) =>
  /^4/.test(n) ? "Visa" : /^(5[1-5]|2[2-7])/.test(n) ? "Mastercard" : /^3[47]/.test(n) ? "American Express" : "";

const groups = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const expiryFmt = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

// Campo con etiqueta flotante (igual que en el checkout)
const field = "peer h-[60px] w-full rounded-lg bg-deep px-4 pt-5 text-white outline-none focus:ring-2 focus:ring-star";
const label =
  "pointer-events-none absolute left-4 top-2 translate-y-0 text-xs text-white/60 transition-all duration-200 " +
  "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-white/50 " +
  "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-star";

export default function PaymentForm({ orderId, total, paid, lines }: { orderId: string; total: number; paid: boolean; lines: Line[] }) {
  const cart = useCart() as unknown as {
    clear?: () => void;
    lines?: { id: string }[];
    remove?: (id: string) => void;
  };
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvc: "" });
  const [status, setStatus] = useState<"form" | "processing" | "ok">(paid ? "ok" : "form");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const brand = brandOf(card.number.replace(/\s/g, ""));

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setStatus("processing");
    setError("");
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, card }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo procesar el pago");
      setResult(data);
      setStatus("ok");
      // Vacía el carrito: usa clear() si existe; si no, quita cada producto con remove()
      if (cart.clear) cart.clear();
      else cart.lines?.forEach((l) => cart.remove?.(l.id));
    } catch (err: any) {
      setError(err.message);
      setStatus("form");
    }
  }

  // ---------- Pago aprobado ----------
  if (status === "ok") {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-2xl bg-card p-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lime text-3xl font-black text-black">✓</div>
          <h1 className="text-2xl font-black">¡Pago aprobado!</h1>
          <p className="mt-2 opacity-80">Pedido #{orderId} · {cop(total)}</p>
          {result && (
            <p className="mt-1 text-sm opacity-70">
              {result.brand} terminada en {result.last4} · Ref. {result.paymentId}
            </p>
          )}
          <p className="mt-4 text-sm opacity-80">Te enviaremos la confirmación al correo registrado.</p>
          <Link href="/tienda" className="mt-6 inline-block rounded-lg bg-star px-6 py-3 font-bold text-black hover:brightness-110">
            Volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Formulario de pago ----------
  const busy = status === "processing";
  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-2">
      <section className="rounded-2xl bg-card p-6 text-white">
        <h2 className="mb-4 text-xl font-black">Pedido #{orderId}</h2>
        {lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-3 border-b border-white/10 py-2">
            <span>{l.name} × {l.quantity}</span>
            <span>{cop(l.subtotal)}</span>
          </div>
        ))}
        <p className="mt-4 text-right text-2xl font-black text-star">Total: {cop(total)}</p>
      </section>

      <form onSubmit={pay} className="space-y-3 rounded-2xl bg-card p-6">
        <h2 className="text-xl font-black text-white">Pago con tarjeta</h2>

        <p className="rounded-lg bg-deep/70 p-3 text-xs text-white/80">
          🧪 Pasarela de pruebas: no se hace ningún cobro real. Usa una tarjeta de prueba (cualquier fecha futura y CVC):
          <span className="mt-2 flex flex-wrap gap-2">
            {TEST_CARDS.map((t) => (
              <button type="button" key={t.number} onClick={() => setCard({ ...card, number: groups(t.number) })}
                className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">
                {t.label}
              </button>
            ))}
          </span>
        </p>

        <div className="relative">
          <input id="c-number" required inputMode="numeric" autoComplete="cc-number" placeholder=" " className={field}
            value={card.number} onChange={(e) => setCard({ ...card, number: groups(e.target.value) })} />
          <label htmlFor="c-number" className={label}>Número de tarjeta</label>
          {brand && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/70">{brand}</span>}
        </div>

        <div className="relative">
          <input id="c-name" required autoComplete="cc-name" placeholder=" " className={field}
            value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
          <label htmlFor="c-name" className={label}>Nombre en la tarjeta</label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input id="c-exp" required inputMode="numeric" autoComplete="cc-exp" placeholder=" " className={field}
              value={card.expiry} onChange={(e) => setCard({ ...card, expiry: expiryFmt(e.target.value) })} />
            <label htmlFor="c-exp" className={label}>Vence (MM/AA)</label>
          </div>
          <div className="relative">
            <input id="c-cvc" required inputMode="numeric" autoComplete="cc-csc" placeholder=" " className={field}
              value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            <label htmlFor="c-cvc" className={label}>CVC</label>
          </div>
        </div>

        {error && <p className="rounded-lg bg-black/20 p-3 text-sm text-star">⚠ {error}</p>}

        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime py-3 font-bold text-black disabled:opacity-60">
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />}
          {busy ? "Procesando pago…" : `Pagar ${cop(total)}`}
        </button>
        <Link href="/checkout" className="block text-center text-sm text-white/70 hover:text-white">← Volver al carrito</Link>
      </form>
    </div>
  );
}